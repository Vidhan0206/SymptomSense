import json
from app.models.schemas import ChatRequest, ChatResponse, Assessment, Source
from app.llm.client import nvidia_llm_client, get_llm_model
from app.retrieval.query import retrieve

MAX_TURNS = 5

def process_interview(request: ChatRequest) -> ChatResponse:
    messages = request.messages
    
    # Extract the conversation history (excluding the first system prompt if we were keeping it)
    user_turns = [m for m in messages if m.role == "user"]
    
    # 1. Check if we reached the max turns
    turn_count = len(user_turns)
    
    # Get all symptoms reported by user so far
    all_user_text = "\n".join([m.content for m in user_turns])
    
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
Current turn count: {turn_count}/{MAX_TURNS}.

If the user has provided enough specific symptoms to make a reasonably confident assessment matching the MEDICAL CONTEXT, OR if the turn count has reached {MAX_TURNS}, you MUST generate a final assessment.
If you need more information to narrow down the conditions in the MEDICAL CONTEXT, ask ONE concise follow-up question.

{context_text}

INSTRUCTIONS:
Respond ONLY with a JSON object. No markdown formatting, no code blocks, just raw JSON.
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

    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        llm_messages.append({"role": m.role, "content": m.content})
        
    try:
        response = nvidia_llm_client.chat.completions.create(
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
        print(f"Error calling LLM: {e}")
        # Fallback response
        return ChatResponse(
            is_assessment=False,
            question="I encountered an error analyzing your symptoms. Could you rephrase your last message?"
        )
