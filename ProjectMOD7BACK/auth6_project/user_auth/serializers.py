from rest_framework import serializers
from user_auth.models import CustomUser, Profile


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = CustomUser
        fields = ['names', 'lastnames', 'email', 'password']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user


class UserSerializer(serializers.ModelSerializer):
    alias = serializers.CharField(source='profile.alias', read_only=True)
    bio = serializers.CharField(source='profile.bio', read_only=True)
    profile_image = serializers.ImageField(source='profile.profile_image', read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id', 'names', 'lastnames', 'email',
            'alias', 'bio', 'profile_image',
            'is_active', 'mfa_required', 'is_staff', 'created_at'
        ]


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['names', 'lastnames', 'password', 'mfa_required', 'is_active']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)

        request = self.context.get('request')

        if not request.user.is_staff:
            validated_data.pop('is_active', None)

        if password:
            instance.set_password(password)

        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        password = data.get('password')

        user = CustomUser.objects.filter(email=email).first()

        if not user:
            raise serializers.ValidationError("Invalid email or password")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid email or password")

        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")

        data['user'] = user
        return data


class VerifyMFASerializer(serializers.Serializer):
    challenge_id = serializers.UUIDField()
    code = serializers.CharField(write_only=True)
    purpose = serializers.CharField()


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['alias', 'bio', 'profile_image']
        profile_image = serializers.ImageField(required=False)
