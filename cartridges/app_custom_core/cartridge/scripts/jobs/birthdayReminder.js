/* eslint-disable no-continue */
'use strict';
/* global request */

function execute() {
    var Transaction = require('dw/system/Transaction');
    var Calendar = require('dw/util/Calendar');
    var StringUtils = require('dw/util/StringUtils');

    var CustomerMgr = require('dw/customer/CustomerMgr');
    var profiles = CustomerMgr.queryProfiles('email != null', null);

    Transaction.wrap(function () {
        var tempProfile;
        var todayCalendar = new Calendar(new Date());
        while (profiles.hasNext()) {
            tempProfile = profiles.next();
            var birthdayReminder = tempProfile.custom.birthdayReminder;
            if (!empty(birthdayReminder)) {
                var reminders = JSON.parse(birthdayReminder);

                for (let i = 0; i < reminders.length; i++) {
                    var birthday = new Date(reminders[i].birthday);
                    var tempCalendar = new Calendar(birthday);
                    if (tempCalendar.before(todayCalendar)) {
                        tempCalendar.set(Calendar.YEAR, todayCalendar.get(Calendar.YEAR) + 1);
                        reminders[i].birthday = StringUtils.formatCalendar(tempCalendar, "yyyy-MM-dd");
                    } else {
                        var remindValueAndType = reminders[i].remindBefore.split(':');
                        if (remindValueAndType[1] === 'm') {
                            tempCalendar.set(Calendar.MONTH, tempCalendar.get(Calendar.MONTH) - remindValueAndType[0]);
                        } else if (remindValueAndType[1] === 'w') {
                            tempCalendar.set(Calendar.DATE, tempCalendar.get(Calendar.DATE) - remindValueAndType[0] * 7);
                        }
                        
                        if (tempCalendar.isSameDay(todayCalendar)) {
                            sendBirthdayReminderNotificationMail(reminders[i], tempProfile);
                            tempCalendar = new Calendar(birthday);
                            tempCalendar.set(Calendar.YEAR, tempCalendar.get(Calendar.YEAR) + 1);
                            reminders[i].birthday = StringUtils.formatCalendar(tempCalendar, "yyyy-MM-dd");

                        }
                    }
                }
                tempProfile.custom.birthdayReminder = JSON.stringify(reminders);
            }
        }
    });
}

function sendBirthdayReminderNotificationMail(reminder, registeredUser) {
    var emailHelpers = require('*/cartridge/scripts/helpers/emailHelpers');
    var Site = require('dw/system/Site');
    var Resource = require('dw/web/Resource');

    var userObject = {
        email: registeredUser.email,
        firstName: registeredUser.firstName,
        lastName: registeredUser.lastName,
        nameOfFriend: reminder.name,
        message: reminder.message,
        remainingTimeValue: reminder.remindBefore.split(':')[0],
        remainingTimeUnit: reminder.remindBefore.split(':')[1],
    };

    var emailObj = {
        to: registeredUser.email,
        subject: Resource.msg('email.birthdayreminder.subject', 'account', null),
        from: Site.current.getCustomPreferenceValue('customerServiceEmail') || 'no-reply@testorganization.com'
    };

    emailHelpers.sendEmail(emailObj, 'account/birthdayReminderEmail', userObject);
}

module.exports = {
    execute: execute
};
