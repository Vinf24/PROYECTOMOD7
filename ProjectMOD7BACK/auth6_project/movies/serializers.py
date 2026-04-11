from rest_framework import serializers
from django.db.models import Avg
from movies.models import Movie, Review
from user_auth.models import Profile


class ReviewSerializer(serializers.ModelSerializer):
    alias = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)
    movie_id = serializers.IntegerField(source='movie.id', read_only=True)

    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 
                  'created_at', 'alias', 'user_id',
                  'movie_id', 'movie_title']

    def get_alias(self, obj):
        profile = Profile.objects.filter(user=obj.user).first()
        return profile.alias if profile and profile.alias else obj.user.email


class MovieListSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = ['id', 'title', 'poster', 'poster_url', 'average_rating']

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(avg=Avg('rating'))['avg']
        return round(avg, 1) if avg else None

    def get_poster_url(self, obj):
        if obj.poster:
            return obj.poster.url
        return None


class MovieDetailSerializer(serializers.ModelSerializer):
    average_rating = serializers.SerializerMethodField()
    reviews = ReviewSerializer(many=True, read_only=True)
    user_review = serializers.SerializerMethodField()
    poster_url = serializers.SerializerMethodField()

    class Meta:
        model = Movie
        fields = [
            'id',
            'title',
            'description',
            'poster',
            'poster_url',
            'release_date',
            'average_rating',
            'reviews',
            'user_review'
        ]
        read_only_fields = ['average_rating', 'reviews', 'user_review']

    def get_average_rating(self, obj):
        avg = obj.reviews.aggregate(avg=Avg('rating'))['avg']
        return round(avg, 1) if avg else None

    def get_user_review(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            review = obj.reviews.filter(user=request.user).first()
            if review:
                return {
                    "id": review.id,
                    "rating": review.rating,
                    "comment": review.comment
                }
        return None

    def get_poster_url(self, obj):
        request = self.context.get('request')

        if obj.poster:
            return request.build_absolute_uri(obj.poster.url)

        return None

class MovieCreateSerializer(serializers.ModelSerializer):
    poster = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Movie
        fields = ['title', 'description', 'poster', 'release_date']
