from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from user_auth.models import MFAChallenge
import secrets

def code_6_digits():
    return str(secrets.randbelow(900000) + 100000)

def create_mfa_challenge(user, purpose):

    with transaction.atomic():

        existing = MFAChallenge.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False,
            expires_at__gt=timezone.now()
        ).order_by('-created_at').first()

        if existing:
            return existing, None

        MFAChallenge.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)

        code = code_6_digits()
        hashed_code = make_password(code)

        expires_at = timezone.now() + timedelta(minutes=5)

        mfa_challenge = MFAChallenge.objects.create(
            user=user,
            code_hash=hashed_code,
            channel='email',
            purpose=purpose,
            expires_at=expires_at
        )

        return mfa_challenge, code

def verify_mfa(challenge, code, expected_purpose):
    if challenge.purpose != expected_purpose:
        return False, "invalid_purpose"

    if challenge.is_used:
        return False, "already_used"

    if challenge.expires_at < timezone.now():
        return False, "expired"

    if challenge.attempts >= challenge.max_attempts:
        return False, "max_attempts"

    if not check_password(code, challenge.code_hash):
        challenge.attempts += 1
        challenge.save(update_fields=["attempts"])

        if challenge.attempts >= challenge.max_attempts:
            return False, "max_attempts"

        return False, "invalid_code"

    challenge.is_used = True
    challenge.save(update_fields=["is_used"])

    return True, None