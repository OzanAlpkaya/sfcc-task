'use strict';

var server = require('server');
server.extend(module.superModule);

var URLUtils = require('dw/web/URLUtils');
var csrfProtection = require('*/cartridge/scripts/middleware/csrf');
var userLoggedIn = require('*/cartridge/scripts/middleware/userLoggedIn');
var consentTracking = require('*/cartridge/scripts/middleware/consentTracking');

server.append(
    'Show',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var birthdayReminderText = customer.profile.custom.birthdayReminder;
        
        if (!empty(birthdayReminderText)) {
            var viewData = res.getViewData();
            viewData.birthdayReminders = JSON.parse(birthdayReminderText);
            res.setViewData(viewData);
        }

        next();
    }
);

server.get(
    'AddBirthdayReminder',
    server.middleware.https,
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedInAjax,
    function (req, res, next) {
        var birthdayReminderForm = server.forms.getForm('birthdayReminder');
        birthdayReminderForm.clear();
        res.render('account/editAddBirthdayReminder', {
            birthdayReminderForm: birthdayReminderForm
        });
        next();
    }
);

server.get(
    'EditBirthdayReminder',
    server.middleware.https,
    csrfProtection.generateToken,
    consentTracking.consent,
    userLoggedIn.validateLoggedInAjax,
    function (req, res, next) {
        var reminderIndex = req.querystring.reminderIndex;
        if (reminderIndex) {
            var birthDayReminderText = customer.profile.custom.birthdayReminder;
            var birthDayReminderObject = JSON.parse(birthDayReminderText);

            if (birthDayReminderObject[reminderIndex]) {
                var birthdayReminderForm = server.forms.getForm('birthdayReminder');
                birthdayReminderForm.clear();

                birthdayReminderForm.copyFrom(birthDayReminderObject[reminderIndex]);

                res.render('account/editAddBirthdayReminder', {
                    birthdayReminderForm: birthdayReminderForm,
                    reminderIndex : reminderIndex
                });

                return next();
            }
        }

        res.redirect(URLUtils.url('Account-AddBirthdayReminder'));
        next();
    }
);

server.post(
    'SaveBirthdayReminder',
    server.middleware.https,
    csrfProtection.validateAjaxRequest,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');

        var birthdayReminderForm = server.forms.getForm('birthdayReminder');
        var birthdayReminderFormObj = birthdayReminderForm.toObject();

        var newReminderToSave = {
            name: birthdayReminderFormObj.name,
            message: birthdayReminderFormObj.message,
            birthday: birthdayReminderFormObj.birthday,
            remindBefore: birthdayReminderFormObj.remindBefore,
            remindEveryYear: birthdayReminderFormObj.remindEveryYear
        }

        Transaction.wrap(function () {
            var birthDayReminderText = customer.profile.custom.birthdayReminder;
            if (req.querystring.reminderIndex) {
                var birthDayReminderObject = JSON.parse(birthDayReminderText);
                birthDayReminderObject[req.querystring.reminderIndex] = newReminderToSave;
                customer.profile.custom.birthdayReminder = JSON.stringify(birthDayReminderObject);
            } else {
                if (!empty(birthDayReminderText)) {
                    var birthDayReminderObject = JSON.parse(birthDayReminderText);
                    birthDayReminderObject.push(newReminderToSave);
                    customer.profile.custom.birthdayReminder = JSON.stringify(birthDayReminderObject);
                } else {
                    customer.profile.custom.birthdayReminder = "[" + JSON.stringify(newReminderToSave) + "]";
                }
            }
        });
        res.redirect(URLUtils.url('Account-Show'));
        next();
    }
);

server.get(
    'DeleteBirthdayReminder',
    server.middleware.https,
    userLoggedIn.validateLoggedIn,
    consentTracking.consent,
    function (req, res, next) {
        var Transaction = require('dw/system/Transaction');

        if (req.querystring.reminderIndex) {
            Transaction.wrap(function () {
                var birthDayReminderText = customer.profile.custom.birthdayReminder;
                if (!empty(birthDayReminderText)) {
                    var reminders = JSON.parse(birthDayReminderText);
                    if (reminders.length < 2) {
                        customer.profile.custom.birthdayReminder = "[]";
                    } else {
                        reminders.splice(req.querystring.reminderIndex, 1);
                        customer.profile.custom.birthdayReminder = JSON.stringify(reminders);
                    }
                }
            });
        }

        res.redirect(URLUtils.url('Account-Show'));

        next();
    }
);

module.exports = server.exports();
