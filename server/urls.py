from django.conf.urls import patterns, include, url
import teleport

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    url(r'^$', 'teleport.views.contacts'),
    url(r'^contacts', 'teleport.views.contacts'),
    url(r'^feed', 'teleport.views.feed'),
    url(r'^teleport', 'teleport.views.teleport'),
    url(r'teletalk', 'teleport.views.teletalk'),


    url(r'login', 'teleport.views.login'),
    url(r'register', 'teleport.views.register'),
    url(r'logout', 'teleport.views.logout'),
)
