"""Intent classification using straightforward keyword matching."""

from __future__ import annotations


INTENT_KEYWORDS = {
    "book_appointment": [
        # English
        "book",
        "schedule",
        "new appointment",
        "make appointment",
        # Arabic
        "احجز",
        "حجز",
        "موعد جديد",
        "حدد موعد",
    ],
    "reschedule_appointment": [
        # English
        "reschedule",
        "change appointment",
        "move appointment",
        # Arabic
        "إعادة جدولة",
        "اعادة جدولة",
        "تغيير الموعد",
        "غير الموعد",
    ],
    "cancel_appointment": [
        # English
        "cancel",
        "delete appointment",
        # Arabic
        "إلغاء",
        "الغاء",
        "ألغي الموعد",
        "الغي الموعد",
    ],
    "ask_faq": [
        # English
        "hours",
        "location",
        "price",
        "insurance",
        "faq",
        # Arabic
        "متى",
        "وين",
        "أين",
        "السعر",
        "التأمين",
        "الدوام",
    ],
    "request_human": [
        # English
        "talk to someone",
        "speak to someone",
        "human",
        "agent",
        "representative",
        "real person",
        "customer service",
        # Arabic
        "موظف",
        "بشري",
        "شخص حقيقي",
        "اكلم موظف",
    ],
}


def detect_intent(user_message: str) -> str:
    """Classify a user message into one of the supported intents."""
    normalized_message = user_message.lower().strip()

    for intent, keywords in INTENT_KEYWORDS.items():
        if any(keyword in normalized_message for keyword in keywords):
            return intent

    return "unknown"
