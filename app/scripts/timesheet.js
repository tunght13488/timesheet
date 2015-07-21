'use strict';

var Promise = require('promise-polyfill'),
  $ = require('jquery'),
  moment = require('moment'),
  Mustache = require('mustache'),
  Util = require('./util.js'),
  PunchTime = require('./punchtime.js');

function Timesheet(opts) {
  opts = opts || {};

  var defaultOpts = {
    'month': new Date()
  };
  this.opts = $.extend(defaultOpts, opts);

  moment.locale('en', {
    week: {
      dow: 1
    }
  }); // Set Monday as start of week

  this.employeeId = null;
  this.domain = null;
  this.times = [];

  var that = this;

  var _showLoginOrStartProcessing = function (html) {
    if (html.indexOf('<title>SmartHRM login</title>') > -1) {
      $('#content').html('<h2><a target="_blank" href="' + that.domain + '">Click here</a> to login to HR first, then refresh this page.</h2>');
    } else {
      that.process();
    }
  };

  var _showSystemDown = function () {
    $('#content').html('<h2>HR system is down! <a href="/report.html">Click here</a> to retry.</h2>');
  };

  this.checkHrDomain()
    .then(_showLoginOrStartProcessing)
    .catch(_showSystemDown);
}

Timesheet.prototype.checkHrDomain = function () {
  var that = this,
    hrUrl = 'http://hr.smartosc.com',
    hrmUrl = 'http://hrm.smartosc.com';

  var _checkUrlAvailability = function (url) {
    return Promise.resolve($.ajax(url, {timeout: 5000}))
      .then(function (html) {
        that.domain = url;
        return html;
      });
  };

  return _checkUrlAvailability(hrUrl)
    .catch(function () {
      return _checkUrlAvailability(hrmUrl);
    });
};

Timesheet.prototype.process = function () {
  var that = this,
    startTime = Util.get21LastMonth(that.opts.month);
  
  console.log('processing');

  var _processAllWeeks = function () {
    var processes = [],
      now = moment();

    while (now.isAfter(startTime)) {
      processes.push(
        that.getTimesheetId(startTime)
          .then(that.getTimesheetTable)
          .then(that.parseTimesheetTable)
      );

      startTime = Util.getNextMonday(startTime);
    }

    return Promise.all(processes);
  };
  
  this.getEmployeeId()
    .then(function (employeeId) {
      console.log(employeeId);
    })
    //.then(_processAllWeeks)
    //.then(this.displayTimesheet)
  ;
};

Timesheet.prototype.getEmployeeId = function () {
  var that = this;

  var _getEmployeeId = function (html) {
    that.employeeId = $('<div/>').html(html).find('input[name="txtEmployeeId"]').val();
  };

  return Promise.resolve($.ajax(this.getTimesheetUrl()))
    .then(function (html) {
      console.log(html);
    })
    .then(_getEmployeeId);
};

Timesheet.prototype.getTimesheetId = function (startTime) {
  var that = this;

  var _postData = {
    txtEmployeeId: this.employeeId,
    txtTimesheetPeriodId: 1,
    txtStartDate: Util.getFormattedMonday(startTime),
    txtEndDate: Util.getFormattedSunday(startTime)
  };

  var jqueryPromise = $.ajax(that.getTimesheetUrl(), {method: 'POST', data: _postData});

  var _getTimesheetId = function (html) {
    return $('<div/>').html(html).find('#txtTimesheetId').val();
  };

  return Promise.resolve(jqueryPromise)
    .then(_getTimesheetId);
};

Timesheet.prototype.getTimesheetTable = function (timesheetId) {
  var jqueryPromise = $.ajax(this.getTimesheetUrl(timesheetId));

  var _getTable = function (html) {
    return $('<div/>').html(html).find('table');
  };

  return Promise.resolve(jqueryPromise)
    .then(_getTable);
};

Timesheet.prototype.parseTimesheetTable = function (table) {
  var that = this;

  $(table).find('tbody tr')
    .each(function () {
      var $this = $(this),
        timeIn = $this.find('td:nth-child(4)').html().trim(),
        timeOut = $this.find('td:nth-child(5)').html().trim(),
        punchTime = new PunchTime(timeIn, timeOut);

      that.times.push(punchTime);
    });
};

Timesheet.prototype.displayTimesheet = function () {
  this.times.sort(function (a, b) {
    return a.isAfter(b) ? 1 : -1;
  });

  var content = $('#content');
  var totalSmartTime = 0;
  var totalStupidTime = 0;
  var requiredWorkTime = 0;
  var forgotPunchCount = 0;
  var count = 0;

  $.each(this.times, function () {
    this.count = ++count;
    totalSmartTime += this.smartTime;
    totalStupidTime += this.stupidTime;
    requiredWorkTime += 8;
    if (this.forgotPunch) {
      forgotPunchCount++;
    }
  });

  var diff = totalSmartTime - requiredWorkTime;
  var note = diff > 0 ? 'Thừa ' + diff.toFixed(2) : 'Thiếu ' + (-1 * diff).toFixed(2);

  var totalAfterRecover = totalSmartTime + (8 * forgotPunchCount);
  diff = totalAfterRecover - requiredWorkTime;
  var noteAfterRecover = diff > 0 ? 'Thừa ' + diff.toFixed(2) : 'Thiếu ' + (-1 * diff).toFixed(2);


  var template = $('#timesheet-template').html();
  var data = {
    'totalSmartTime': totalSmartTime.toFixed(2),
    'totalStupidTime': totalStupidTime.toFixed(2),
    'requiredWorkTime': requiredWorkTime,
    'note': note,
    'forgotPunchCount': forgotPunchCount,
    'totalAfterRecover': totalAfterRecover.toFixed(2),
    'noteAfterRecover': noteAfterRecover,
    'punchtimes': this.times
  };
  var rendered = Mustache.render(template, data);
  content.html(rendered);
};

Timesheet.prototype.getTimesheetUrl = function (timesheetId) {
  if (typeof timesheetId === 'undefined') {
    return this.getUrl('/lib/controllers/CentralController.php?timecode=Time&action=View_Detail_Timesheet');
  } else {
    return this.getUrl('/lib/controllers/CentralController.php?timecode=Time&action=View_Detail_Timesheet&id=' + timesheetId);
  }
};

Timesheet.prototype.getUrl = function (path) {
  return this.domain + path;
};

module.exports = Timesheet;