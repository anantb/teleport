from django.db import models

'''
Teleport Models

@author: Anant Bhardwaj
@date: Apr 29, 2013
'''


class User(models.Model):
	id = models.AutoField(primary_key=True)
	email = models.CharField(max_length=100, unique = True)
	f_name = models.CharField(max_length=50)
	l_name = models.CharField(max_length=50)
	password = models.CharField(max_length=50)
	
	def __unicode__(self):
		return self.name

	class Meta:
		db_table = "users"


class Contact(models.Model):
	id = models.AutoField(primary_key=True)
	user1 = models.ForeignKey('User')
	user2 = models.CharField(max_length=100)
	status = models.BooleanField(default=False)
	timestamp = models.DateTimeField(auto_now=True)
	def __unicode__(self):
		unique_together = (user1, user2)
		return self.name

	class Meta:
		db_table = "contacts"



