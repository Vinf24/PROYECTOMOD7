from requests import request
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q
from django.core.paginator import Paginator

from movies.models import Movie, Review
from movies.serializers import (
    MovieListSerializer, MovieDetailSerializer, ReviewSerializer,
    MovieCreateSerializer
)

# Create your views here.


class MovieListView(APIView):
    def get(self, request):
        order = request.query_params.get("order")
        search = request.query_params.get("search")
        page = request.query_params.get("page", 1)

        movies = Movie.objects.all()

        if search:
            movies = movies.filter(title__icontains=search)

        if order == "mejor_valoradas":
            movies = movies.annotate(avg=Avg('reviews__rating')).order_by('-avg')

        elif order == "mas_reseñadas":
            movies = movies.annotate(count=Count('reviews')).order_by('-count')

        elif order == "orden_alfabético":
            movies = movies.order_by('title')

        paginator = Paginator(movies, 8)  # 8 por página
        page_obj = paginator.get_page(page)

        serializer = MovieListSerializer(page_obj, many=True)

        return Response({
            "results": serializer.data,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number
        })


class MovieDetailView(APIView):
    def get(self, request, pk):
        print(request.user)
        print(request.user.is_authenticated)

        movie = get_object_or_404(Movie, pk=pk)
        serializer = MovieDetailSerializer(movie, context={'request': request})
        return Response(serializer.data)


class CreateReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, movie_id):
        movie = get_object_or_404(Movie, pk=movie_id)
        comment = request.data.get('comment')
        try:
            rating = int(request.data.get('rating'))
        except (TypeError, ValueError):
            return Response({"error": "Nota inválida"}, status=400)

        if Review.objects.filter(user=request.user, movie=movie).exists():
            return Response(
                {"error": "Ya has reseñado esta película"},
                status=400
            )

        if not rating or int(rating) < 1 or int(rating) > 10:
            return Response({"error": "La nota debe ser entre 1 y 10"}, status=400)

        if not comment or not comment.strip():
            return Response({"error": "Comentario requerido"}, status=400)

        serializer = ReviewSerializer(data=request.data)

        if serializer.is_valid():
            Review.objects.create(
                user=request.user,
                movie=movie,
                rating=serializer.validated_data['rating'],
                comment=serializer.validated_data['comment']
            )
            return Response({"message": "Reseña creada"}, status=201)

        return Response(serializer.errors, status=400)


class UpdateReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        review = get_object_or_404(Review, pk=pk)

        if review.user != request.user:
            return Response({"error": "No autorizado"}, status=403)

        if 'rating' in request.data:
            rating = int(request.data.get('rating'))
            if rating < 1 or rating > 10:
                return Response({"error": "La nota debe ser entre 1 y 10"}, status=400)

        if 'comment' in request.data:
            if not request.data.get('comment').strip():
                return Response({"error": "El comentario no puede estar vacío"}, status=400)

        serializer = ReviewSerializer(review, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)


class DeleteReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        review = get_object_or_404(Review, pk=pk)

        if review.user != request.user:
            return Response({"error": "No autorizado"}, status=403)

        review.delete()
        return Response({"message": "Reseña eliminada"})


class ReviewListView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get(self, request):

        user_id = request.query_params.get("user_id")
        search = request.query_params.get("search")
        page = request.query_params.get("page", 1)
        movie_id = request.query_params.get("movie_id")

        reviews = Review.objects.select_related('movie', 'user').all().order_by('-created_at')

        if user_id:
            reviews = reviews.filter(user_id=user_id)

        if movie_id:
            reviews = reviews.filter(movie_id=movie_id)

        if search:
            reviews = reviews.filter(
                Q(movie__title__icontains=search)
            )

        paginator = Paginator(reviews, 5)
        page_obj = paginator.get_page(page)

        serializer = ReviewSerializer(
            page_obj,
            many=True
        )

        return Response({
            "results": serializer.data,
            "total_pages": paginator.num_pages,
            "current_page": page_obj.number
        })


class CreateMovieView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = MovieCreateSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        print(serializer.errors)
        return Response(serializer.errors, status=400)


class DeleteMovieView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]

    def delete(self, request, pk):
        movie = get_object_or_404(Movie, pk=pk)
        movie.delete()
        return Response({"message": "Película eliminada"})


class UpdateMovieView(APIView):
    permission_classes = [IsAuthenticated, IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        movie = get_object_or_404(Movie, pk=pk)
        serializer = MovieCreateSerializer(movie, data=request.data, partial=True)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)

        return Response(serializer.errors, status=400)
