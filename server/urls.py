from django.conf.urls import patterns, include, url

import teleport

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    url(r'^$', 'teleport.views.contacts'),
    url(r'^contacts', 'teleport.views.contacts'),
    url(r'^get_contacts', 'teleport.views.get_contacts'),
    url(r'^add_contact', 'teleport.views.add_contact'),

    url(r'^feed', 'teleport.views.feed'),
    url(r'^get_feeds', 'teleport.views.get_feeds'),
    url(r'^teleport', 'teleport.views.teleport'),
    url(r'^teletalk', 'teleport.views.teletalk'),

    url(r'^get_session', 'teleport.views.get_session'),
    url(r'^get_token', 'teleport.views.get_token'),

    url(r'^login', 'teleport.views.login'),
    url(r'^register', 'teleport.views.register'),
    url(r'^settings', 'teleport.views.settings'),
    url(r'^invite_email/(\w+)$', 'server.views.invite_email'),
    url(r'^logout', 'teleport.views.logout'),
)
