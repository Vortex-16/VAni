import traceback
from report_generator import RecoveryReportGenerator

test_data = {
    "name": "Test Patient",
    "period": "Last 7 Days",
    "adherence": 85,
    "taken": 24,
    "missed": 3,
    "total": 27,
    "medications": [
        {"name": "Test Med", "dosage": "10mg", "status": "Completed"}
    ],
    "insights": ["Test insight"],
    "summary": "Test summary",
    "recommendations": ["Test rec"]
}

try:
    print("Testing Report Generator...")
    generator = RecoveryReportGenerator(test_data)
    pdf_bytes = generator.generate()
    print(f"Success! Generated {len(pdf_bytes)} bytes.")
except Exception as e:
    print("FAILED!")
    traceback.print_exc()
