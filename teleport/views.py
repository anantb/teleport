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

def login_required(f):
	def wrap(request, *args, **kwargs):
		if SESSION_KEY not in request.session.keys():
			return HttpResponseRedirect("/login")
		return f(request, *args, **kwargs)
	wrap.__doc__=f.__doc__
	wrap.__name__=f.__name__
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
			user = User(email=email, password=password, f_name = f_name, l_name = l_name)
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
def teleport(request):
	return render_to_response('teleport.html')

@login_required
def teletalk(request):
	return render_to_response('teletalk.html')
		
	


