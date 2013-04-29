from django.conf.urls import patterns, include, url
import teleport

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'teleport.views.teleport'),
    url(r'^teleport', 'teleport.views.teleport'),
    url(r'teletalk', 'teleport.views.teletalk'),
)
