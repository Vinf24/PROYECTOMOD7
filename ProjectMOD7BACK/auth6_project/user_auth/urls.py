from django.urls import path
from user_auth.views import (
    LoginView, MFAChallengeView, RegisterView, CheckSessionView,
    ToggleMFAView, LogoutView, verify_mfa_page, inicio_page
    )

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('verify-mfa/', MFAChallengeView.as_view(), name='verify_mfa'),
    path('register/', RegisterView.as_view(), name='register'),
    path('toggle-mfa/', ToggleMFAView.as_view(), name='toggle_mfa'),
    path('mfa/verify/', verify_mfa_page),
    path('inicio/', inicio_page),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('check-session/', CheckSessionView.as_view()),
]
