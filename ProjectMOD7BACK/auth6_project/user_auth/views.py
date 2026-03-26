from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from user_auth.serializers import LoginSerializer, VerifyMFASerializer, RegisterSerializer
from user_auth.models import MFAChallenge
from django.contrib.auth.hashers import make_password
from user_auth.services.mfa_service import create_mfa_challenge, verify_mfa
import secrets
from django.utils import timezone
from user_auth.services.email_service import send_mfa_code_email
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required

# Create your views here.

class RegisterView(APIView):
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "message": "User registered successfully",
            "user": {
                "id": user.id,
                "names": user.names,
                "lastnames": user.lastnames,
                "email": user.email
            }
        }, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        if user.mfa_required:
            mfa_challenge, code = create_mfa_challenge(user, "login")
            send_mfa_code_email(user, code)

            return Response({
                "message": "MFA required", 
                "challenge_id": mfa_challenge.id
            }, status=status.HTTP_200_OK)

        login(request, user)

        user.last_login_at = timezone.now()
        user.save(update_fields=['last_login_at'])

        remember_me = str(request.data.get("remember_me")).lower() == "true"

        if remember_me:
            request.session.set_expiry(1209600)
        else:
            request.session.set_expiry(0)

        return Response({
            "message": "Login successful",
            "mfa_required": False,
            "user": {
                "id": user.id,
                "names": user.names,
                "lastnames": user.lastnames,
                "email": user.email
            }
        }, status=status.HTTP_200_OK)

class MFAChallengeView(APIView):
    def post(self, request):
        serializer = VerifyMFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge_id = serializer.validated_data['challenge_id']
        code = serializer.validated_data['code']

        try:
            mfa_challenge = MFAChallenge.objects.get(id=challenge_id)
        except MFAChallenge.DoesNotExist:
            return Response({"error": "Invalid MFA challenge"}, status=status.HTTP_400_BAD_REQUEST)

        valid, reason = verify_mfa(mfa_challenge, code, "login")

        if not valid:
            if reason == "max_attempts":
                mfa_challenge.delete()

                return Response(
                    {"error": "MFA attempts exceeded"},
                    status=status.HTTP_403_FORBIDDEN
                )

            if reason == "expired":
                return Response(
                    {"error": "MFA expired"},
                    status=status.HTTP_403_FORBIDDEN
                )

            return Response(
                {"error": "Invalid MFA code"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = mfa_challenge.user
        login(request, user)

        remember_me = str(request.data.get("remember_me")).lower() == "true"

        if remember_me:
            request.session.set_expiry(1209600)
        else:
            request.session.set_expiry(0)

        user.last_login_at = timezone.now()
        user.save()

        mfa_challenge.is_used = True
        mfa_challenge.save()

        return Response({
            "message": "MFA verification successful",
            "user": {
                "id": user.id,
                "email": user.email
            }
        }, status=status.HTTP_200_OK)

class ToggleMFAView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        user.mfa_required = not user.mfa_required
        user.save()

        return Response({
            "mfa_required": user.mfa_required
        })

class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"message": "Logged out"})
    
class CheckSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            "authenticated": True,
            "user": {
                "id": request.user.id,
                "email": request.user.email
            }
        })

def login_page(request):
    return render(request, 'login.html')

def verify_mfa_page(request):
    return render(request, 'verify_mfa.html')

@login_required
def inicio_page(request):
    return render(request, 'inicio.html')
