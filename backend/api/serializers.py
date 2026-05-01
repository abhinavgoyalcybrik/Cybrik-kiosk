from rest_framework import serializers
from .models import Course, University


class UniversityMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ["name", "country", "city"]


class CourseRecommendationSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()
    title = serializers.CharField()
    university = UniversityMiniSerializer()
    degree_level = serializers.CharField()
    field_of_study = serializers.CharField()
    status = serializers.CharField()
    score = serializers.FloatField()
    reasons = serializers.ListField(child=serializers.CharField())