import json
from app.models.schemas import ChatRequest, ChatResponse, Assessment, Source
from app.llm.client import llm_client, get_llm_model
from app.retrieval.query import retrieve
from app.retrieval.cache import check_cache, store_cache
from app.security.pii_scrubber import scrub_text

MIN_TURNS = 3
MAX_TURNS = 5

def process_interview(request: ChatRequest) -> ChatResponse:
    messages = request.messages
    
    # Extract the conversation history (excluding the first system prompt if we were keeping it)
    user_turns = []
    llm_messages = []
    
    for m in messages:
        if m.role == "user":
            # Truncate to prevent context window overflow (approx 3000 tokens)
            if len(m.content) > 12000:
                m.content = m.content[:12000] + "\n...[Text Truncated due to length]..."
            
            scrubbed_content = scrub_text(m.content)
            # Replace original content with scrubbed content for this processing run
            m.content = scrubbed_content
            user_turns.append(m)
        llm_messages.append({"role": m.role, "content": m.content})
    
    # 1. Check if we reached the max turns
    turn_count = len(user_turns)
    
    # Get all symptoms reported by user so far (now scrubbed)
    all_user_text = "\n".join([m.content for m in user_turns])
    
    # Check Semantic Cache first (Versioned to bust old buggy caches)
    CACHE_VERSION = "v2"
    cache_key = CACHE_VERSION + " | " + " | ".join([f"{m['role']}:{m['content']}" for m in llm_messages])
    # Semantic Cache is fully enabled and working
    cached_result = check_cache(cache_key)
    
    if cached_result:
        if cached_result.get("is_assessment"):
            return ChatResponse(
                is_assessment=True,
                assessment=Assessment(**cached_result["assessment"])
            )
        else:
            return ChatResponse(
                is_assessment=False,
                question=cached_result.get("question", "Could you tell me more about your symptoms?")
            )
            
    # 2. Retrieve medical context based on the cumulative user text
    retrieved_chunks = retrieve(all_user_text, k=3)
    
    context_text = "MEDICAL CONTEXT:\n"
    sources_dict = {}
    for i, chunk in enumerate(retrieved_chunks):
        cond = chunk['metadata'].get('condition_name', 'Unknown')
        url = chunk['metadata'].get('source_url', '')
        context_text += f"[{i+1}] Condition: {cond}\nText: {chunk['text']}\n\n"
        sources_dict[cond] = url

    # 3. Decision Prompt: Do we ask a follow-up or provide an assessment?
    system_prompt = f"""You are SymptomSense, an AI Clinical Interview Assistant.
Your job is to ask adaptive follow-up questions to understand the user's symptoms, and eventually provide a grounded health assessment based ONLY on the provided MEDICAL CONTEXT.

Important: You are for informational purposes only, not a diagnostic tool. 
Current turn count: {turn_count} (Min required: {MIN_TURNS}, Max allowed: {MAX_TURNS}).

RULE 1: Normally, if the turn count is less than {MIN_TURNS}, you MUST ask a follow-up question. HOWEVER, if the user has uploaded a comprehensive lab report or medical document, you MAY bypass this rule and immediately generate a final assessment analyzing the report.
RULE 2: If the turn count is >= {MIN_TURNS} and you have enough specific symptoms to make a confident assessment, OR if the turn count has reached {MAX_TURNS}, you MUST generate a final assessment.
RULE 3: If you need more information, ask ONE concise follow-up question.
RULE 4: You MUST respond in the EXACT same language that the user is using in their latest message (e.g., if the user types in Hindi or Hinglish, you MUST reply in Hindi/Hinglish). Do NOT default to English if the user is typing in another language.

{context_text}

INSTRUCTIONS:
Respond ONLY with a JSON object. No markdown formatting, no code blocks, just raw JSON.
If the condition is an emergency (e.g. Heart Attack), explicitly tell the user to call Indian emergency numbers (112 or 108).
If you are asking a follow-up question, return:
{{
  "is_assessment": false,
  "question": "Your follow up question here..."
}}

If you are providing a final assessment, return:
{{
  "is_assessment": true,
  "assessment": {{
    "condition": "Name of the condition",
    "confidence": "low" | "medium" | "high",
    "urgency": "low" | "medium" | "high" | "emergency",
    "reasoning": "Explanation based on the medical context and user symptoms",
    "sources": [
      {{"condition": "Condition Name", "url": "URL from context"}}
    ],
    "next_steps": ["Step 1", "Step 2"]
  }}
}}
"""

    llm_messages.insert(0, {"role": "system", "content": system_prompt})
        
    try:
        response = llm_client.chat.completions.create(
            model=get_llm_model(),
            messages=llm_messages,
            temperature=0.3,
            max_tokens=1000,
        )
        
        content = response.choices[0].message.content.strip()
        
        # Clean up any potential markdown formatting the LLM might have ignored
        if content.startswith("```json"):
            content = content[7:]
        if content.startswith("```"):
            content = content[3:]
        if content.endswith("```"):
            content = content[:-3]
            
        result_dict = json.loads(content)
        
        # Store in Semantic Cache
        store_cache(cache_key, result_dict)
        
        if result_dict.get("is_assessment"):
            return ChatResponse(
                is_assessment=True,
                assessment=Assessment(**result_dict["assessment"])
            )
        else:
            return ChatResponse(
                is_assessment=False,
                question=result_dict.get("question", "Could you tell me more about your symptoms?")
            )
            
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error calling LLM or processing response:\n{error_details}")
        # Fallback response
        return ChatResponse(
            is_assessment=False,
            question=f"I encountered an error analyzing your symptoms. Please try sending a shorter message or a smaller file."
        )
