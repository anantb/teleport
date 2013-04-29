from django.http import *
from django.shortcuts import render_to_response
from django.views.decorators.csrf import csrf_exempt
from django.core.context_processors import csrf

'''
@author: Anant Bhardwaj
@date: Apr 27, 2013
'''



def earth(request):
	return render_to_response('earth.html')
		
	


