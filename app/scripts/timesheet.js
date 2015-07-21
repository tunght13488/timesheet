'use strict';

var $ = require('jquery'),
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

  this
    .getDomain()
    .done(function (data) {
      if (data.indexOf('<title>SmartHRM login</title>') > -1) {
        $('#content').html('<h2><a target="_blank" href="' + this.domain + '">Click here</a> to login to HR first, then refresh this page.</h2>');
      } else {
        this.init();
      }
    }.bind(this))

    .fail(function () {
      $('#content').html('<h2>HR system is down! <a href="/report.html">Click here</a> to retry.</h2>');
    });
}

Timesheet.prototype.getDomain = function () {
  var _this = this;
  return $.ajax({
    url: 'http://hr.smartosc.com',
    timeout: 1000
  })
    .then(
    function (data) {
      _this.domain = 'http://hr.smartosc.com';
      return data;
    },
    function () {
      _this.domain = 'http://hrm.smartosc.com';
      return $.ajax({
        url: 'http://hrm.smartosc.com',
        timeout: 10000
      });
    }
  );
};

Timesheet.prototype.getUrl = function (path) {
  return this.domain + path;
};

Timesheet.prototype.init = function () {
  var _this = this;
  var startTime = Util.get21LastMonth(_this.opts.month);
  var chained = this.initPostData();
  var processes = [];
  var parseTimesheetDetail = function (table) {
    _this.parseTimesheetDetail(table);
  };
  while (moment().isAfter(startTime)) {
    processes.push(
      chained
        .then(this.getTimesheetId(startTime))
        .then(this.getTimesheetDetail.bind(this))
        .then(parseTimesheetDetail)
    );
    startTime = Util.getNextMonday(startTime);
  }

  $.when.apply(null, processes).done(this.displayTimesheet.bind(this));
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

Timesheet.prototype.parseTimesheetDetail = function (table) {
  var _this = this;
  table.find('tbody tr').each(function () {
    var timeIn = $(this).find('td:nth-child(4)').html().trim();
    var timeOut = $(this).find('td:nth-child(5)').html().trim();
    var punchTime = new PunchTime(timeIn, timeOut);
    _this.times.push(punchTime);
  });
};

Timesheet.prototype.initPostData = function () {
  var _this = this;
  return $.ajax({
    url: _this.getUrl('/lib/controllers/CentralController.php?timecode=Time&action=View_Current_Timesheet')
  })
    .then(function (data) {
      var dom = $('<div/>').html(data);
      _this.employeeId = dom.find('input[name="txtEmployeeId"]').val();
    });
};

Timesheet.prototype.getTimesheetId = function (fromDate) {
  var _this = this;
  return function () {
    return $.ajax({
      url: _this.getUrl('/lib/controllers/CentralController.php?timecode=Time&action=View_Timesheet'),
      method: 'POST',
      data: {
        txtEmployeeId: _this.employeeId,
        txtTimesheetPeriodId: 1,
        txtStartDate: Util.getFormattedMonday(fromDate),
        txtEndDate: Util.getFormattedSunday(fromDate)
      }

    })
      .then(function (data) {
        var dom = $('<div/>').html(data);
        return dom.find('#txtTimesheetId').val();
      });
  };
};

Timesheet.prototype.getTimesheetDetail = function (timesheetId) {
  return $.ajax({
    url: this.getUrl('/lib/controllers/CentralController.php?timecode=Time&action=View_Detail_Timesheet&id=' + timesheetId)
  })
    .then(function (data) {
      return $('<div/>').html(data).find('table');
    });
};

module.exports = Timesheet;