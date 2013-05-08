import json
import OpenTokSDK, datetime, smtplib, hashlib
from django.http import *
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf
from django.views.decorators.http import require_http_methods
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from django.db.models import Q

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


def send_email(addr, subject, msg_body):
    email_subject = subject
    from_addr="no-reply@teleport.csail.mit.edu"
    to_addr = [addr]

    msg = MIMEMultipart()
    msg['From'] = 'Teleport Notification<no-reply@teleport.csail.mit.edu>'
    msg['To'] = ",".join(to_addr)
    msg['Subject'] = email_subject
    msg.attach(MIMEText(msg_body))


    username = 'anantb'
    password = 'JcAt250486'
    smtp_conn = smtplib.SMTP_SSL('cs.stanford.edu', 465)
    #smtp_conn.ehlo()
    #smtp_conn.starttls()
    #smtp_conn.ehlo()
    smtp_conn.login(username, password)
    #smtp_conn.set_debuglevel(True)
    smtp_conn.sendmail(from_addr, to_addr, msg.as_string())
    smtp_conn.close()


@csrf_exempt
def invite_email(request):
    login_email = request.session[SESSION_KEY]
    to_email = request.POST["email"]
    subject = "%s has invited you to Teleport" %(login_email)
    msg_body = """
    Dear %s,

    %s has invited you to Teleport, an application designed to keep you and your loved ones together.
    Please click the below link to join Teleport:

    http://teleport.csail.mit.edu/register

    """ %(to_email, login_email)
    send_email(to_email, subject, msg_body)
    return HttpResponse(json.dumps({'status':'ok'}),  mimetype="application/json")




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
            login_password = hashlib.sha1(request.POST["login_password"]).hexdigest()
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
            password = hashlib.sha1(request.POST["password"]).hexdigest()
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
    return render_to_response('contacts.html', {'api_key': OPENTOK_API_KEY, 'login_id': request.session[SESSION_KEY]})


@login_required
def feed(request):
    return render_to_response('feed.html')

@csrf_exempt
@login_required
def add_feed(request):
    user = User.objects.get(email=request.session[SESSION_KEY])
    msg = request.POST["msg"]
    f1 = Feed(from_addr = user.email, msg = "%s: %s" %(user.f_name + user.l_name, msg))
    f1.save()
    return HttpResponse(json.dumps({'status':'ok'}), mimetype="application/json")


@login_required
def teleport(request):
    return render_to_response('teleport.html')

@csrf_exempt
@login_required
def add_contact(request):
    if request.method == "POST":
        user1 = request.session[SESSION_KEY]
        user2 = request.POST["email"]
        c1 = Contact(user1=user1, user2=user2)
        c1.save()
        c2 = Contact(user1=user2, user2=user1)
        c2.save()
        try:
            f1 = Feed(to_addr = user1, from_addr = user2, msg = "You added %s to your contact list." %(user2))
            f2 = Feed(to_addr = user1, from_addr = user2, msg = "%s added you in his contact list." %(user2))
            f1.save()
            f2.save()
        except:
            print sys.exc_info()
            pass
        return HttpResponse(json.dumps({'invite':user2}), mimetype="application/json")

    else:
        return render_to_response('add_contact.html')


@login_required
def get_contacts(request):
    user = User.objects.get(email=request.session[SESSION_KEY])
    res = {'status':False, 'user': request.session[SESSION_KEY]}
    try:
        res['status'] = True
        res['contacts'] = []
        contacts = Contact.objects.filter(user1=user.email).values()
        for c in contacts:
            name = ''
            u= User.objects.filter(email=c['user2']).values()
            if(len(u)>0):
                name = u[0]['f_name'] + ' ' + u[0]['l_name']
            else:
                name = c['user2']
            res['contacts'].append({'email':c['user2'], 'name':name, 'status':c['status']})
    except:
        print sys.exc_info()
        res['code'] = 'UNKNOWN_ERROR'
    return HttpResponse(json.dumps(res), mimetype="application/json")


@login_required
def get_feeds(request):
    user = User.objects.get(email=request.session[SESSION_KEY])
    res = {'status':False, 'user': request.session[SESSION_KEY]}
    try:
        feeds = Feed.objects.filter(Q(to_addr=user.email) | Q(to_addr = None) | Q(to_addr = '')).order_by('-timestamp').values()
        res['status'] = True
        res['feeds'] = []
        for f in feeds:
            res['feeds'].append({'timestamp':format_date_time(f['timestamp']), 'msg':f['msg'], 'from':f['from_addr']})
    except:
        print sys.exc_info()
        res['code'] = 'UNKNOWN_ERROR'
    return HttpResponse(json.dumps(res), mimetype="application/json")


def format_date_time(d):
    return datetime.datetime.strftime(d, '%Y/%m/%d %H:%M:%S')


@login_required
def teletalk(request):
    return render_to_response('teletalk.html', {'api_key': OPENTOK_API_KEY, 'login_id': request.session[SESSION_KEY]})


@login_required
def settings(request):
    user = User.objects.get(email=request.session[SESSION_KEY])
    c = {'email':user.email, 'fname':user.f_name, 'lname':user.l_name}
    c.update(csrf(request))
    return render_to_response('settings.html', c)

def update_settings(request):
    if request.method == "POST":
        try:
            user = User.objects.get(email=request.session[SESSION_KEY])
            password = request.POST["password"]
            f_name = request.POST["f_name"]
            l_name = request.POST["l_name"]
            user.f_name=f_name
            user.l_name=l_name
            user.save()
            if(password.strip() !=""):
                user.password=hashlib.sha1(password)
            user.save()
            return HttpResponseRedirect('/settings')
        except:
            print sys.exc_info()
            return HttpResponseRedirect('/settings')
    else:
        return HttpResponseRedirect('/settings')


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
