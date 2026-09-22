from presidio_analyzer import AnalyzerEngine
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine

# Initialize engines once to save resources
try:
    # Use the small model for fast downloading and low RAM
    configuration = {
        "nlp_engine_name": "spacy",
        "models": [{"lang_code": "en", "model_name": "en_core_web_sm"}],
    }
    provider = NlpEngineProvider(nlp_configuration=configuration)
    nlp_engine = provider.create_engine()
    
    analyzer = AnalyzerEngine(nlp_engine=nlp_engine, supported_languages=["en"])
    anonymizer = AnonymizerEngine()
    _is_ready = True
except Exception as e:
    print(f"Warning: Failed to initialize Presidio engines: {e}")
    _is_ready = False

def scrub_text(text: str) -> str:
    """
    Analyzes the input text for PII (Personally Identifiable Information) 
    and replaces it with redacted tags like [PERSON], [PHONE_NUMBER], etc.
    """
    if not _is_ready or not text:
        return text
        
    try:
        # Call analyzer to get results
        results = analyzer.analyze(text=text, entities=["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "LOCATION", "US_SSN", "UK_NHS"], language='en')
        
        # Analyzer results are passed to the AnonymizerEngine for anonymization
        anonymized_text = anonymizer.anonymize(text=text, analyzer_results=results)
        
        return anonymized_text.text
    except Exception as e:
        print(f"Error during PII scrubbing: {e}")
        return text
