import json
import OpenTokSDK
from django.http import *
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf
from django.views.decorators.http import require_http_methods

from models import *

'''
@author: Anant Bhardwaj
@date: Apr 27, 2013
'''

SESSION_KEY = 'user'

OPENTOK_API_KEY = "28119882"
OPENTOK_API_SECRET = "ae83e52f07163e5ff1629cae2c46d92548141326"

opentok_sdk = OpenTokSDK.OpenTokSDK(OPENTOK_API_KEY, OPENTOK_API_SECRET)
role_constants = OpenTokSDK.RoleConstants

# TODO: Make sure you have reverse proxy (if any) configured correctly (e.g. mod_rpaf installed for Apache).
def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def login_required(f):
    def wrap(request, *args, **kwargs):
        if SESSION_KEY not in request.session.keys():
            return HttpResponseRedirect("/login")
        return f(request, *args, **kwargs)
    wrap.__doc__ = f.__doc__
    wrap.__name__ = f.__name__
    return wrap


def login_form(request):
    c = {}
    c.update(csrf(request))
    return render_to_response('login.html', c)


def register_form(request):
    c = {}
    c.update(csrf(request))
    return render_to_response('register.html', c)


def login(request):
    if request.method == "POST":
        try:
            login_email = request.POST["login_email"]
            login_password = request.POST["login_password"]
            user = User.objects.get(email=login_email, password=login_password)
            request.session.flush()
            request.session[SESSION_KEY] = user.email
            return HttpResponseRedirect('/')
        except:
            print sys.exc_info()
            return login_form(request)
    else:
        return login_form(request)


def register(request):
    if request.method == "POST":
        try:
            email = request.POST["email"]
            password = request.POST["password"]
            f_name = request.POST["f_name"]
            l_name = request.POST["l_name"]
            user = User(email=email, password=password, f_name=f_name, l_name=l_name)
            user.save()
            request.session.flush()
            request.session[SESSION_KEY] = user.email
            return HttpResponseRedirect('/')
        except:
            print sys.exc_info()
            return register_form(request)
    else:
        return register_form(request)


def logout(request):
    request.session.flush()
    return HttpResponseRedirect('/login')


@login_required
def contacts(request):
    return render_to_response('contacts.html')


@login_required
def feed(request):
    return render_to_response('feed.html')


@login_required
def teleport(request):
    return render_to_response('teleport.html')


@login_required
def teletalk(request):
    return render_to_response('teletalk.html')


@csrf_exempt
def get_session(request):
    session_properties = {OpenTokSDK.SessionProperties.p2p_preference: "disabled"}
    ret = {}
    try:
        session = opentok_sdk.create_session(None, session_properties)
        ret = {'session_id': session.session_id, }
    except Exception:
        ret = {'error': True}
    return HttpResponse(json.dumps(ret), mimetype="application/json")


@csrf_exempt
def get_token(request):
    session_id = request.POST['session_id']
    token = opentok_sdk.generate_token(session_id, role_constants.PUBLISHER)
    ret = {'token': token, }
    return HttpResponse(json.dumps(ret), mimetype="application/json")


@login_required
def send_invite(request):
    session_id = request.META['POST'].get('session_id')
    inviter_id = request.META['POST'].get('inviter_id')
    invitee_id = request.META['POST'].get('invitee_id')

    ret = {'error': True}

    # TODO: enter into the database with current timestamp. Note that sessions do not exipire

    return HttpResponse(json.dumps(ret), mimetype="application/json")
