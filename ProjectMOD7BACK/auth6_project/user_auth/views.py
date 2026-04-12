from datetime import timedelta
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import (
    IsAuthenticated, IsAdminUser, 
    IsAuthenticatedOrReadOnly, AllowAny
    )
from rest_framework import status
from user_auth.serializers import (
    LoginSerializer, VerifyMFASerializer, RegisterSerializer,
    UserSerializer, UserUpdateSerializer, ProfileSerializer
    )
from user_auth.models import MFAChallenge, CustomUser
from user_auth.services.mfa_service import create_mfa_challenge, mask_email, verify_mfa
from user_auth.services.email_service import send_mfa_code_email
from user_auth.services.rate_limit_service import is_rate_limited
from user_auth.permissions import IsOwner
from django.db.models import Q
from django.utils import timezone
from django.contrib.auth import login, logout
from django.contrib.auth.password_validation import validate_password
from django.shortcuts import get_object_or_404
from django.core.paginator import Paginator

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

        if is_rate_limited(request, "login", limit=5, window=60):
            return Response(
                {"error": "Demasiados intentos. Intenta más tarde."},
                status=429
            )

        if user.mfa_required:
            mfa_challenge, code = create_mfa_challenge(user, "login")
            send_mfa_code_email(user, code)

            return Response({
                "message": "MFA required", 
                "challenge_id": mfa_challenge.id,
                "masked_email": mask_email(user.email)
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
            "user": UserSerializer(user).data
        }, status=status.HTTP_200_OK)


class MFAChallengeView(APIView):
    def post(self, request):
        serializer = VerifyMFASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        challenge_id = serializer.validated_data['challenge_id']
        code = serializer.validated_data['code']

        if is_rate_limited(request, "verify_mfa", limit=5, window=60):
            return Response(
                {"error": "Demasiados intentos de verificación"},
                status=429
            )

        try:
            mfa_challenge = MFAChallenge.objects.get(id=challenge_id)
        except MFAChallenge.DoesNotExist:
            return Response({"error": "Invalid MFA challenge"}, status=status.HTTP_400_BAD_REQUEST)

        purpose = serializer.validated_data['purpose']

        valid, reason = verify_mfa(mfa_challenge, code, purpose)

        if not valid:
            return Response(reason or {"error": "Error MFA"}, status=400)

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
            "user": UserSerializer(user).data
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
    permission_classes = [AllowAny]

    def get(self, request):

        if request.user.is_authenticated:
            return Response({
                "authenticated": True,
                "user": {
                    "id": request.user.id,
                    "email": request.user.email,
                    "is_staff": request.user.is_staff
                }
            })

        return Response({
            "authenticated": False
        })


class UserListView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        active = request.query_params.get('active')
        page = request.query_params.get("page", 1)
        search = request.query_params.get("search")

        users = CustomUser.objects.all()

        if search:
            filters = Q(email__icontains=search) | Q(names__icontains=search) | Q(lastnames__icontains=search)

            if search.isdigit():
                filters |= Q(id=int(search))

            users = users.filter(filters)

        if active == "true":
            users = users.filter(is_active=True)
        elif active == "false":
            users = users.filter(is_active=False)

        paginator = Paginator(users, 5)
        page_obj = paginator.get_page(page)

        serializer = UserSerializer(page_obj, many=True)

        return Response({
            "results": serializer.data,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number
        })


class UserDetailView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        user = get_object_or_404(CustomUser, pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)


class UserUpdateView(APIView):
    permission_classes = [IsAuthenticated, IsOwner]

    def patch(self, request, pk):
        user = get_object_or_404(CustomUser, pk=pk)

        self.check_object_permissions(request, user)

        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors)


class UserDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        user = get_object_or_404(CustomUser, pk=pk)

        self.check_object_permissions(request, user)

        user.is_active = False
        user.save()

        return Response({"message": "Usuario desactivado"})


class DeleteMyAccountView(APIView):
    permission_classes = [IsAuthenticated]
    def delete(self, request):
        user = request.user

        if user.mfa_required and not request.data.get("mfa_code"):
            mfa_challenge, code = create_mfa_challenge(user, "delete_account")
            send_mfa_code_email(user, code)

            return Response({
                "mfa_required": True,
                "challenge_id": str(mfa_challenge.id),
                "masked_email": mask_email(user.email)
            })

        if user.mfa_required:
            challenge_id = request.data.get("challenge_id")
            mfa_code = request.data.get("mfa_code")

            mfa_challenge = MFAChallenge.objects.get(id=challenge_id)

            if mfa_challenge.user != user:
                return Response({"error": "Challenge inválido"}, status=403)

            if mfa_challenge.purpose != "delete_account":
                return Response({"error": "Purpose inválido"}, status=400)

            valid, reason = verify_mfa(mfa_challenge, mfa_code, "delete_account")

            if not valid:
                return Response(reason, status=400)

        user.is_active = False
        user.save()

        logout(request)

        return Response({
            "message": "Cuenta eliminada",
            "force_logout": True
            })

class AdminPanelView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def get(self, request):
        return Response({
            "message": "Welcome to the admin panel",
            "user": request.user.email
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request}
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")
        confirm_password = request.data.get("confirm_password")

        if not user.check_password(old_password):
            return Response({"error": "Contraseña actual incorrecta"}, status=400)

        if new_password != confirm_password:
            return Response({"error": "Las contraseñas no coinciden"}, status=400)

        if user.mfa_required and not request.data.get("mfa_code"):

            mfa_challenge, code = create_mfa_challenge(user, "change_password")
            send_mfa_code_email(user, code)

            return Response({
                "mfa_required": True,
                "challenge_id": str(mfa_challenge.id),
                "masked_email": mask_email(user.email)
            })

        if user.mfa_required:
            challenge_id = request.data.get("challenge_id")
            mfa_code = request.data.get("mfa_code")

            mfa_challenge = MFAChallenge.objects.get(id=challenge_id)

            if mfa_challenge.user != user:
                return Response({"error": "Challenge inválido"}, status=403)

            if mfa_challenge.purpose != "change_password":
                return Response({"error": "Purpose inválido"}, status=400)

            valid, reason = verify_mfa(mfa_challenge, mfa_code, "change_password")

            if not valid:
                return Response(reason, status=400)

        validate_password(new_password, user)

        user.set_password(new_password)
        user.save()

        logout(request)

        return Response({
            "message": "Contraseña actualizada",
            "force_logout": True
            })


class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        current_email = request.data.get("current_email")
        new_email = request.data.get("new_email")

        if user.email != current_email:
            return Response({"error": "Email actual incorrecto"}, status=400)

        if CustomUser.objects.filter(email=new_email).exists():
            return Response({"error": "El email ya está en uso"}, status=400)

        if user.mfa_required and not request.data.get("mfa_code"):

            mfa_challenge, code = create_mfa_challenge(user, "change_email")
            send_mfa_code_email(user, code)

            return Response({
                "mfa_required": True,
                "challenge_id": str(mfa_challenge.id),
                "masked_email": mask_email(user.email)
            })

        if user.mfa_required:
            challenge_id = request.data.get("challenge_id")
            mfa_code = request.data.get("mfa_code")

            mfa_challenge = MFAChallenge.objects.get(id=challenge_id)

            if mfa_challenge.user != user:
                return Response({"error": "Challenge inválido"}, status=403)

            if mfa_challenge.purpose != "change_email":
                return Response({"error": "Purpose inválido"}, status=400)

            valid, reason = verify_mfa(mfa_challenge, mfa_code, "change_email")

            if not valid:
                return Response(reason, status=400)

        user.email = new_email
        user.is_email_verified = False
        user.save()

        logout(request)

        return Response({
            "message": "Email actualizado",
            "force_logout": True
            })


class ResendMFAView(APIView):
    def post(self, request):

        if is_rate_limited(request, "resend_mfa", limit=3, window=60):
            return Response(
                {"error": "Demasiadas solicitudes de código"},
                status=429
            )

        challenge_id = request.data.get("challenge_id")

        if not challenge_id:
            return Response({"error": "challenge_id requerido"}, status=400)

        try:
            old_challenge = MFAChallenge.objects.get(id=challenge_id)
        except MFAChallenge.DoesNotExist:
            return Response({"error": "Challenge inválido"}, status=400)

        if old_challenge.is_used:
            return Response({"error": "Challenge ya utilizado"}, status=400)

        user = old_challenge.user
        purpose = old_challenge.purpose

        last_challenge = MFAChallenge.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False
        ).order_by('-created_at').first()

        if last_challenge and (timezone.now() - last_challenge.created_at) < timedelta(seconds=30):
            return Response(
                {"error": "Debes esperar antes de solicitar otro código"},
                status=429
            )

        MFAChallenge.objects.filter(
            user=user,
            purpose=purpose,
            is_used=False
        ).update(is_used=True)

        new_challenge, code = create_mfa_challenge(user, purpose)
        send_mfa_code_email(user, code)

        return Response({
            "challenge_id": str(new_challenge.id),
            "masked_email": mask_email(user.email)
        })
