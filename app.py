"""Terminal-based AI receptionist demo."""

import re
from datetime import datetime

from services.intent_router import detect_intent
from services.safety_guard import detect_emergency


def is_arabic_text(text: str) -> bool:
    """Return True if the message contains Arabic letters."""
    return bool(re.search(r"[\u0600-\u06FF]", text))


def main() -> None:
    """Run a simple chat loop until the user exits."""
    print("Welcome to [Hospital Name] AI Receptionist. How can I assist you today?")
    print("Type 'exit' at any time to end the chat.")

    while True:
        user_message = input("You: ").strip()
        use_arabic = is_arabic_text(user_message)

        # Stop the program when the user asks to exit.
        if user_message.lower() == "exit":
            print("Thank you for contacting us. Take care.")
            break

        # Show all saved appointments.
        if user_message.lower() == "show appointments":
            try:
                with open("appointments.txt", "r", encoding="utf-8") as file:
                    appointments = [line.strip() for line in file if line.strip()]

                if not appointments:
                    print("No appointments found")
                else:
                    print("Saved appointments:")
                    for index, appointment in enumerate(appointments, start=1):
                        print(f"{index}. {appointment}")
            except FileNotFoundError:
                print("No appointments found")
            print("Is there anything else I can help you with?")
            continue

        # Safety always comes first.
        if detect_emergency(user_message):
            if use_arabic:
                print("⚠️ قد تكون هذه حالة طارئة. يُرجى الاتصال بخدمات الطوارئ فورًا.")
            else:
                print("⚠️ Your message may indicate an emergency. Please call emergency services immediately.")
            continue

        # Otherwise classify and show the detected intent.
        intent = detect_intent(user_message)
        if intent == "book_appointment":
            if use_arabic:
                print("بالتأكيد، سأساعدك في طلب حجز موعد.")
                department = input("ما القسم الذي ترغب بحجز موعد فيه؟ ").strip()
            else:
                print("Of course. I can help you with an appointment request.")
                department = input("Which department would you like to book an appointment with? ").strip()

            while not department:
                if use_arabic:
                    print("يرجى إدخال اسم القسم حتى أستطيع متابعة الطلب.")
                    department = input("ما القسم الذي ترغب بحجز موعد فيه؟ ").strip()
                else:
                    print("Please enter a department so I can continue your request.")
                    department = input("Which department would you like to book an appointment with? ").strip()

            if use_arabic:
                print("شكرًا لك.")
                preferred_date = input("ما التاريخ الذي تفضله للموعد؟ (YYYY-MM-DD) ").strip()
            else:
                print("Thank you.")
                preferred_date = input("What date would you prefer for your appointment? (YYYY-MM-DD) ").strip()
            while True:
                try:
                    datetime.strptime(preferred_date, "%Y-%m-%d")
                    break
                except ValueError:
                    if use_arabic:
                        print("عذرًا، لم أتمكن من قراءة التاريخ. يرجى استخدام الصيغة YYYY-MM-DD.")
                        preferred_date = input("ما التاريخ الذي تفضله للموعد؟ (YYYY-MM-DD) ").strip()
                    else:
                        print("I’m sorry, I couldn’t read that date. Please use the format YYYY-MM-DD.")
                        preferred_date = input("What date would you prefer for your appointment? (YYYY-MM-DD) ").strip()

            # Keep temporary answers in local variables for this conversation turn.
            _appointment_request = {
                "department": department,
                "preferred_date": preferred_date,
            }

            if use_arabic:
                print("تم استلام طلب الموعد، وسيتواصل معك فريقنا قريبًا.")
                name = input("قبل أن ننهي، ما اسمك من فضلك؟ ").strip()
            else:
                print("Your appointment request has been received. Our team will contact you shortly.")
                name = input("Before we finish, may I please have your name? ").strip()
            while len(name) < 2:
                if use_arabic:
                    print("يرجى إدخال اسم صحيح مكوّن من حرفين على الأقل.")
                    name = input("قبل أن ننهي، ما اسمك من فضلك؟ ").strip()
                else:
                    print("Please enter a valid name with at least 2 characters.")
                    name = input("Before we finish, may I please have your name? ").strip()
            _appointment_request["name"] = name
            if use_arabic:
                print(f"شكرًا لك يا {name}، تم تسجيل طلبك وسنتواصل معك قريبًا.")
            else:
                print(f"Thank you, {name}. Your request has been recorded, and we’ll be in touch soon.")

            # Save the booking to a simple text file (one booking per line).
            with open("appointments.txt", "a", encoding="utf-8") as file:
                file.write(
                    f"name={_appointment_request['name']}, "
                    f"department={_appointment_request['department']}, "
                    f"date={_appointment_request['preferred_date']}\n"
                )
            if use_arabic:
                print("هل هناك أي شيء آخر يمكنني مساعدتك به؟")
            else:
                print("Is there anything else I can help you with?")
        elif intent == "request_human":
            if use_arabic:
                print("بالتأكيد، سأقوم بتحويلك إلى أحد موظفي فريقنا.")
                print("هل هناك أي شيء آخر يمكنني مساعدتك به؟")
            else:
                print("Certainly. I will connect you to a member of our team.")
                print("Is there anything else I can help you with?")
        elif intent == "cancel_appointment":
            if use_arabic:
                print("بكل تأكيد. يرجى تزويدي بتفاصيل موعدك حتى نتمكن من إلغائه.")
                print("هل هناك أي شيء آخر يمكنني مساعدتك به؟")
            else:
                print("Of course. Please provide your appointment details so we can process the cancellation.")
                print("Is there anything else I can help you with?")
        elif intent == "unknown":
            if use_arabic:
                print("هل يمكنك توضيح طلبك بشكل أكبر حتى أتمكن من مساعدتك؟")
                print("هل هناك أي شيء آخر يمكنني مساعدتك به؟")
            else:
                print("I'm sorry, I didn't understand that. I can help with booking, cancelling, or connecting you to a human.")
                print("Is there anything else I can help you with?")
        else:
            print(f"Detected intent: {intent}")


if __name__ == "__main__":
    main()
