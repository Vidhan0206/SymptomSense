import json
import os
import sys
import time

# Add backend directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.schemas import ChatRequest, Message
from app.interview.state_machine import process_interview

def run_evaluation():
    # Load test cases
    test_cases_path = os.path.join(os.path.dirname(__file__), "test_cases.json")
    with open(test_cases_path, "r") as f:
        test_cases = json.load(f)

    print(f"Starting Evaluation on {len(test_cases)} test cases...\n")
    print("-" * 50)
    
    total_cases = len(test_cases)
    correct_diagnoses = 0
    pii_successfully_scrubbed = 0

    for idx, tc in enumerate(test_cases):
        print(f"Test Case {idx + 1}: {tc['description']}")
        
        # Build ChatRequest
        messages = [Message(**m) for m in tc["input_messages"]]
        # We need to simulate the state machine deciding to assess instead of asking a question.
        # Since state_machine asks follow-ups up to MIN_TURNS, we might need to pad the conversation
        # to force an assessment, or temporarily bypass MIN_TURNS for evaluation.
        # But let's see what the pipeline does by default!
        
        request = ChatRequest(messages=messages)
        
        start_time = time.time()
        response = process_interview(request)
        latency = time.time() - start_time
        
        print(f"Latency: {latency:.2f}s")
        
        # Check PII Redaction
        original_text = tc["input_messages"][-1]["content"]
        # The backend modifies request.messages in place, let's see if John Doe was scrubbed
        scrubbed_text = request.messages[-1].content
        
        if tc.get("pii_present"):
            if "John Doe" not in scrubbed_text and "555-0198" not in scrubbed_text:
                pii_successfully_scrubbed += 1
                print("[PASS] PII Redaction: Successful")
            else:
                print("[FAIL] PII Redaction: Failed")
        else:
            pii_successfully_scrubbed += 1 # Auto pass if none expected
            print("[PASS] PII Redaction: N/A")

        # Check Diagnostic Accuracy (if assessment was returned)
        if response.assessment:
            suspected_condition = response.assessment.suspected_condition
            if tc["expected_condition"].lower() in suspected_condition.lower():
                correct_diagnoses += 1
                print(f"[PASS] Diagnosis: Correct ({suspected_condition})")
            else:
                print(f"[FAIL] Diagnosis: Failed. Expected '{tc['expected_condition']}', got '{suspected_condition}'")
        else:
            print(f"[-] Diagnosis: In progress (LLM asked a follow-up question instead of diagnosing): '{response.question}'")
            # For strict evaluation, we want it to diagnose. We might have to pad history to force it.

        print("-" * 50)

    # Final Report
    print("\n=== EVALUATION REPORT ===")
    
    # We only count diagnosis accuracy for cases where an assessment was actually given.
    print(f"Total Test Cases Run: {total_cases}")
    print(f"PII Redaction Success Rate: {(pii_successfully_scrubbed / total_cases) * 100:.1f}%")
    
    print("=========================")

if __name__ == "__main__":
    run_evaluation()
