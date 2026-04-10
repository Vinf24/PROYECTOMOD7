from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from movies.views import (
    MovieListView, MovieDetailView, CreateReviewView,
    MyReviewsView, UpdateReviewView, DeleteReviewView, UserReviewsView,
    CreateMovieView, UpdateMovieView, DeleteMovieView
)

urlpatterns = [
    path('', MovieListView.as_view()),
    path('<int:pk>/', MovieDetailView.as_view()),
    path('<int:movie_id>/reviews/', CreateReviewView.as_view()),
    path('reviews/<int:pk>/', UpdateReviewView.as_view()),
    path('reviews/<int:pk>/delete/', DeleteReviewView.as_view()),
    path('my-reviews/', MyReviewsView.as_view()),
    path('user/<int:user_id>/reviews/', UserReviewsView.as_view()),
    path('create/', CreateMovieView.as_view()),
    path('<int:pk>/update/', UpdateMovieView.as_view()),
    path('<int:pk>/delete/', DeleteMovieView.as_view()),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
