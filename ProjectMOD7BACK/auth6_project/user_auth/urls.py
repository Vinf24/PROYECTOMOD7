from django.urls import path
from user_auth.views import (
    ChangeEmailView, ChangePasswordView, LoginView, MFAChallengeView, RegisterView, 
    CheckSessionView, ResendMFAView, ToggleMFAView, 
    LogoutView, DeleteMyAccountView, AdminPanelView,
    ProfileView, MeView
    )

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('verify-mfa/', MFAChallengeView.as_view(), name='verify_mfa'),
    path('register/', RegisterView.as_view(), name='register'),
    path('toggle-mfa/', ToggleMFAView.as_view(), name='toggle_mfa'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('check-session/', CheckSessionView.as_view()),
    path('delete-account/', DeleteMyAccountView.as_view(), name='delete_account'),
    path('admin/panel/', AdminPanelView.as_view()),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view()),
    path('change-email/', ChangeEmailView.as_view()),
    path("resend-mfa/", ResendMFAView.as_view()),
]
