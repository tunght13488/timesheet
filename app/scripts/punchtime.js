'use strict';

var moment = require('moment');

function PunchTime(timeIn, timeOut) {
  this.forgotPunch = false;
  this.forgotText = 'FORGOT';
  if (timeIn === '') {
    timeIn = timeOut;
    this.forgotPunch = 'in';
  }

  if (timeOut === '') {
    timeOut = timeIn;
    this.forgotPunch = 'out';
  }

  this.timeIn = moment(timeIn);
  this.timeOut = moment(timeOut);
  this.smartTime = 0;
  this.stupidTime = 0;
  this.calculateWorkTime();
}

PunchTime.prototype.calculateWorkTime = function () {
  if (this.forgotPunch) {
    return;
  }

  var timeIn = this.timeIn,
    timeOut = this.timeOut,
    workStart = moment().hour(7).minute(30).second(0),
    lunchStart = moment().hour(12).minute(0).second(0),
    lunchEnd = moment().hour(13).minutes(30).second(0),
    lunchTime,
    workEnd = moment().hour(18).minutes(30).second(0),
    stupidTimeBefore = Math.max(0, workStart.diff(timeIn, 'hours', true)),
    stupidTimeAfter = Math.max(0, timeOut.diff(workEnd, 'hours', true)),
    calculatedWorkStart = moment.max(workStart, timeIn), // worktime count from 7:30 AM
    calculatedWorkEnd = moment.min(workEnd, timeOut); // worktime count to 6:30 PM

  var diffInHour = function (start, end) {
    return end.diff(start, 'hours', true);
  };

  // In before lunch start
  //   - Out before lunch start: 0
  //   - Out before lunch end: out - start
  //   - Out after lunch end: end - start
  // In before lunch end
  //   - Out before lunch end: out - in
  //   - Out after lunch end: end - in 
  // In after lunch end: 0
  if (calculatedWorkStart.isBefore(lunchStart)) {
    if (calculatedWorkEnd.isBefore(lunchStart)) {
      lunchTime = 0;
    } else if (calculatedWorkEnd.isBefore(lunchEnd)) {
      lunchTime = diffInHour(calculatedWorkEnd, lunchEnd);
    } else {
      lunchTime = diffInHour(lunchStart, lunchEnd);
    }
  } else if (calculatedWorkStart.isBefore(lunchEnd)) {
    if (calculatedWorkEnd.isBefore(lunchEnd)) {
      lunchTime = diffInHour(calculatedWorkStart, calculatedWorkEnd);
    } else {
      lunchTime = diffInHour(calculatedWorkStart, lunchEnd);
    }
  } else {
    lunchTime = 0;
  }

  this.smartTime = calculatedWorkEnd.diff(calculatedWorkStart, 'hours', true) - lunchTime;
  this.stupidTime = stupidTimeBefore + stupidTimeAfter;
}
;

PunchTime.prototype.isAfter = function (another) {
  return this.timeIn.isAfter(another.timeIn);
};

PunchTime.prototype.toHtml = function () {
  return this.getDate() + ' - ' + this.getPunchIn() + ' - ' + this.getPunchOut() + ' - ' + this.getSmartTime() + ' - ' + this.getStupidTime() + '<br/>';
};

PunchTime.prototype.getDate = function () {
  return this.timeIn.format('ddd, LL');
};

PunchTime.prototype.getPunchIn = function () {
  return this.forgotPunch === 'in' ? this.forgotText : this.timeIn.format('LT');
};

PunchTime.prototype.getPunchOut = function () {
  return this.forgotPunch === 'out' ? this.forgotText : this.timeOut.format('LT');
};

PunchTime.prototype.getSmartTime = function () {
  return this.smartTime.toFixed(2);
};

PunchTime.prototype.getStupidTime = function () {
  return this.stupidTime.toFixed(2);
};

module.exports = PunchTime;