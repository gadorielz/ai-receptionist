"""Simple safety checks for potentially urgent medical messages."""

from __future__ import annotations


# Emergency keywords in English and Arabic.
# The matcher is intentionally simple and beginner-friendly.
EMERGENCY_KEYWORDS = [
    # English
    "chest pain",
    "trouble breathing",
    "bleeding",
    "fainting",
    "seizure",
    "unconscious",
    "emergency",
    # Arabic
    "ألم في الصدر",
    "الم في الصدر",
    "ضيق تنفس",
    "صعوبة في التنفس",
    "نزيف",
    "اغماء",
    "إغماء",
    "نوبة",
    "تشنج",
    "فاقد الوعي",
    "غير واعي",
    "حالة طوارئ",
    "طوارئ",
]


def detect_emergency(user_message: str) -> bool:
    """Return True when the input text appears to describe an emergency."""
    normalized_message = user_message.lower().strip()
    return any(keyword in normalized_message for keyword in EMERGENCY_KEYWORDS)
