from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string

def send_mfa_code_email(user, code):
    subject = 'Your MFA Code'
    from_email = settings.DEFAULT_FROM_EMAIL
    to_email = user.email

    context = {
        'user': user,
        'code': code,
    }

    try:
        text_content = render_to_string('mfa_email.txt', context)
    except Exception:
        text_content = f"Hello {user.email},\n\nYour MFA code is: {code}\n\nThis code will expire in 5 minutes."

    try:
        html_content = render_to_string('mfa_email.html', context)
    except Exception:
        html_content = f"""
        <html>
            <body>
                <p>Hello {user.email},</p>
                <p>Your MFA code is: <strong>{code}</strong></p>
                <p>This code will expire in 5 minutes.</p>
            </body>
        </html>
        """

    email = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
    email.attach_alternative(html_content, "text/html")
    email.send()
