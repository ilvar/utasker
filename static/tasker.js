var taskerApp = angular.module('taskerApp', ['ngRoute', 'ui.bootstrap']);

taskerApp.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/profile', {
      templateUrl: 'profile.html',
      controller: 'ProfileCtrl'
    }).
    when('/save', {
      templateUrl: 'export.html',
      controller: 'SaveCtrl'
    }).
    when('/archives/:archive', {
      templateUrl: 'import.html',
      controller: 'LoadCtrl'
    }).
    when('/', {
      templateUrl: 'tasks.html',
      controller: 'TasksCtrl'
    }).
    otherwise({
      redirectTo: '/'
    });
}]);

taskerApp.controller('ProfileCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
  $rootScope.menu_section = 'profile';

  var profile_data = localStorage.getItem('utasker_profile');
  if (profile_data) {
    $scope.profile = JSON.parse(profile_data);
    $scope.profile.day_start = new Date($scope.profile.day_start);
    $scope.profile.day_end = new Date($scope.profile.day_end);
  } else {
    $scope.profile = {};
    $scope.profile.day_start = new Date().set({hour: 10, minute: 0, second: 0, millisecond: 0});
    $scope.profile.day_end = new Date().set({hour: 20, minute: 0, second: 0, millisecond: 0});
  }

  $scope.alerts = [];

  $scope.saveProfile = function() {
    localStorage.setItem('utasker_profile', angular.toJson($scope.profile));
    $scope.alerts.push({type: 'success', msg: 'Data saved successfully'});
  };

  $scope.closeAlert = function(index) {
    $scope.alerts.splice(index, 1);
  }
}]);

taskerApp.controller('SaveCtrl', ['$scope', '$rootScope', '$http', function($scope, $rootScope, $http) {
  $rootScope.menu_section = 'save';

  $scope.save_url = '';

  $scope.saveData = function() {
    var data = localStorage.getItem('utasker_tasks') || '[]';
    var url = '/save/';
    if ($scope.server_key) {
      url = '/archives/' + $scope.server_key + '.json';
    }
    $http.post(url, data).success(function(result) {
      localStorage.setItem('utasker_key', result.key);
      localStorage.setItem('utasker_dt', parseInt(result.dt));
      $scope.save_url = result.url;
      $('#export_qr').qrcode(result.url);
    })
  };
}]);

taskerApp.controller('LoadCtrl', ['$scope', '$http', '$routeParams', '$location', function($scope, $http, $routeParams, $location) {
  $http.get('/archives/' + $routeParams.archive + '.json').success(function(result) {
    if (result.archive) {
      localStorage.setItem('utasker_key', result.key);
      localStorage.setItem('utasker_dt', parseInt(result.dt));
      localStorage.setItem('utasker_tasks', JSON.stringify(result.archive));
      $location.path('/');
    }
  });
}]);

taskerApp.controller('TasksCtrl', ['$scope', '$rootScope', '$modal', '$http', '$interval', function($scope, $rootScope, $modal, $http, $interval) {
  $rootScope.menu_section = 'tasks';

  var tasks_data = localStorage.getItem('utasker_tasks');
  if (tasks_data) {
    $scope.tasks = JSON.parse(tasks_data);
  } else {
    $scope.tasks = [];
  }

  var profile_data = localStorage.getItem('utasker_profile');
  if (profile_data) {
    $scope.profile = JSON.parse(profile_data);
    $scope.profile.day_start = new Date($scope.profile.day_start);
    $scope.profile.day_end = new Date($scope.profile.day_end);
  } else {
    $scope.profile = {};
    $scope.profile.day_start = new Date().set({hour: 10, minute: 0, second: 0, millisecond: 0});
    $scope.profile.day_end = new Date().set({hour: 20, minute: 0, second: 0, millisecond: 0});
  }

  $scope.server_key = localStorage.getItem('utasker_key');

  $scope.syncWithServer = function() {
    var local_dt = localStorage.getItem('utasker_dt');
    if ($scope.server_key && local_dt) {
      $http.get('/archives/' + $scope.server_key + '.json').success(function(result) {
        if (result.archive && parseInt(result.dt) > parseInt(local_dt)) {
          localStorage.setItem('utasker_dt', parseInt(result.dt));
          localStorage.setItem('utasker_tasks', JSON.stringify(result.archive));
          $scope.tasks = result.archive;
          $scope.sortTasks();
        }
      });
    }
  };

  if ($scope.server_key) {
    $http.get('/archives/' + $scope.server_key + '.json').success(function(result) {
      if (result.archive) {
        localStorage.setItem('utasker_dt', parseInt(result.dt));
        localStorage.setItem('utasker_tasks', JSON.stringify(result.archive));
        $scope.tasks = result.archive;
        $scope.sortTasks();
      }
    });

    $interval($scope.syncWithServer, 60 * 1000);
  }

  $scope.tasks = _.reject($scope.tasks, function(task) {
    var three_days_ago = Date.today().add(1).days();
    var task_date;
    if (!task.date) {
      return task.done;
    } else {
      task_date = new Date(task.date);
      return task.done && task_date < three_days_ago
    }
  });

  $scope.sortTasks = function() {
    $scope.tasks = _.sortBy($scope.tasks, function (task) {
      return new Date(task.date);
    });
  };

  $scope.sortTasks();

  $scope.DATE_FORMAT = 'YYYY MM DD';

  $scope.today_date = moment(new Date().add(0).days()).format('dddd MMM D');
  $scope.tomorrow_date = moment(new Date().add(1).days()).format('dddd MMM D');

  $scope.augmentTasks = function(tasks, column) {
    var active_tasks = _.filter(tasks, function(t) {
      return !t.done;
    });
    return _.map(active_tasks, function (t) {
      var now = new Date();
      var task_date;

      t.status = 'default';
      t.from_now = '';
      t.is_today = column == 'today';
      t.is_tomorrow = column == 'tomorrow';
      t.is_incoming = column == 'incoming';
      t.is_timeless = column == 'timeless';

      if (t.date) {
        task_date = new Date(t.date);
        if (t.is_today) {
          t.from_now = moment(task_date).fromNow();
          if (task_date < now) {
            t.status = 'danger';
          } else if (task_date < now.add(2).hours()) {
            t.status = 'warning';
          } else {
            t.status = 'default';
          }
        } else if (t.is_tomorrow) {
          t.from_now = moment(task_date).format('HH:mm');
        } else {
          t.from_now = moment(task_date).format('dddd MMM D');
        }
      }

      return t
    });
  };

  $scope.getTasksToday = function() {
    var today = Date.today();
    var today_str = moment(today).format($scope.DATE_FORMAT);
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return task.date && (new Date(task.date) <= today || today_str == task.date_str);
    }), 'today');
  };

  $scope.getTasksTomorrow = function() {
    var tomorrow = Date.today().add(1).days();
    var tomorrow_str = moment(tomorrow).format($scope.DATE_FORMAT);
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return task.date && tomorrow_str == task.date_str;
    }), 'tomorrow');
  };

  $scope.getTasksIncoming = function() {
    var limit_date = Date.today().add(1).days().set({ hour: 23, minute: 59 });
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return task.date && new Date(task.date) > limit_date;
    }), 'incoming');
  };

  $scope.getTasksTimeless = function() {
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return !task.date_str;
    }), 'timeless');
  };

  $scope.new_task_string = '';
  $scope.new_task_data = {};

  $scope.parseDate = function(bit) {
    var now = new Date();
    var task_date = moment(bit, 'DD.MM.YYYY hh:mm');
    var strictDate = true;
    if (!task_date.isValid()) {
      task_date = moment(bit, 'DD.MM.YYYY');
      if (!task_date.isValid()) {
        task_date = moment(bit, 'DD.MM');
        if (!task_date.isValid()) {
          task_date = moment(Date.parse(bit));
          strictDate = false;
        }
      }
    }
    task_date = task_date.toDate();
    var next_task_date;
    if (task_date) {
      if (task_date < now) {
        next_task_date = Date.parse('Next ' + bit);
        if (!strictDate && next_task_date && next_task_date >= now) {
          task_date = next_task_date;
        } else {
          task_date = new Date().add(1).hours();
        }
      }

      if (task_date.getHours() == 0 && task_date.getMinutes() == 0) {
        var task_update = {year: task_date.getFullYear(), month: task_date.getMonth(), day: task_date.getDate()};
        var begin_date = $scope.profile.day_start.set(task_update);
        if (task_date < begin_date) {
          task_date = begin_date;
        }
      }

      $scope.new_task_data.date = task_date;
      $scope.new_task_data.date_str = moment(task_date).format($scope.DATE_FORMAT);
    }
  };

  $scope.saveData = function() {
    _.each($scope.tasks, function(task) {
      if (task.date) {
        task.date = new Date(task.date);
        task.date.setMinutes(Math.floor(task.date.getMinutes() / 15) * 15);
        task.date_str = moment(task.date).format($scope.DATE_FORMAT);
      } else {
        task.date_str = null;
      }
    });
    localStorage.setItem('utasker_tasks', angular.toJson($scope.tasks));
    $scope.pushToServer();
  };

  $scope.pushToServer = function() {
    if ($scope.server_key) {
        $http.post('/archives/'+$scope.server_key+'.json', angular.toJson($scope.tasks));
    }
  };

  $scope.parseString = function() {
    var bits = _.map($scope.new_task_string.split('@'), function(s) {
      return s.trim();
    });
    $scope.new_task_data.title = bits[0];
    if (bits.length == 2 && bits[1]) {
      $scope.parseDate(bits[1]);
      if (!$scope.new_task_data.date) {
        $scope.new_task_data.project = bits[1];
      }
    }
    if (bits.length == 3 && bits[2]) {
      $scope.parseDate(bits[2]);
      $scope.new_task_data.project = bits[1];
    }
    if ($scope.new_task_data.date) {
      var task_date = $scope.new_task_data.date;
      var now = new Date();
      var today = new Date().clearTime().add(1).days();
      var tomorrow = new Date().clearTime().add(2).days();
      if (task_date.isBefore(today)) {
        $scope.new_task_data.from_now = 'Today ' + moment(task_date).from(now);
      } else if (task_date.isBefore(tomorrow)) {
        $scope.new_task_data.from_now = 'Tomorrow ' + moment(task_date).format('HH:mm');
      } else {
        $scope.new_task_data.from_now = moment(task_date).format('dddd MMM D');
      }
    }

  };

  $scope.$watch('new_task_string', function(newValue, oldValue) {
    if (newValue.length != oldValue.length) {
      $scope.parseString();
    }
  });

  $scope.addTask = function() {
    $scope.parseString();
    if ($scope.new_task_data.title) {
      if ($scope.editing_task) {
        $scope.new_task_data.url = $scope.editing_task.url;
        $scope.new_task_data.note = $scope.editing_task.note;
        $scope.tasks = _.reject($scope.tasks, function(t) {
          return t == $scope.editing_task;
        });
        $scope.editing_task = null;
      }
      $scope.tasks.push($scope.new_task_data);

      $scope.new_task_string = '';
      $scope.new_task_data = {};
      $scope.sortTasks();
      $scope.saveData();
    }
  };

  $scope.editing_task = null;

  $scope.editTask = function(task) {
    $scope.editing_task = task;
    $scope.new_task_string = task.title;
    if (task.project) {
      $scope.new_task_string += ' @ ' + task.project;
    }
    if (task.date) {
      console.log(task.date);
      $scope.new_task_string += ' @ ' + moment(task.date).format('DD.MM.YYYY HH:mm');
    }
  };

  $scope.deleteTask = function(task) {
    $scope.tasks = _.reject($scope.tasks, function(t) {
      return t == task;
    });
    $scope.saveData();
  };

  $scope.moveRight = function(task) {
    var task_date;
    var now = new Date();
    if (!task.is_timeless) {
      task_date = new Date(task.date);
      if (task_date < now) {
        task_date = now;
      }
      task_date = task_date.add(1).days();

      var task_update = {year: task_date.getFullYear(), month: task_date.getMonth(), day: task_date.getDate()};
      var begin_date = $scope.profile.day_start.set(task_update);
      if (task_date < begin_date) {
        task_date = begin_date;
      }
      var end_date = $scope.profile.day_end.set(task_update);
      if (task_date > end_date) {
        task_date = end_date.add(-1).hours();
      }

      task.date = task_date;
      task.date_str = moment(task.date).format($scope.DATE_FORMAT);
      $scope.sortTasks();
      $scope.saveData();
    }
  };

  $scope.moveLeft = function(task) {
    var task_date;
    var now = new Date();
    if (!task.is_timeless && !task.is_today) {
      task_date = new Date(task.date).add(-1).days();
      if (task_date < now) {
        task_date = now;
      }

      var task_update = {year: task_date.getFullYear(), month: task_date.getMonth(), day: task_date.getDate()};
      var begin_date = $scope.profile.day_start.set(task_update);
      if (task_date < begin_date) {
        task_date = begin_date;
      }
      var end_date = $scope.profile.day_end.set(task_update);
      if (task_date > end_date) {
        task_date = end_date.add(-1).hours();
      }

      task.date = task_date;
      task.date_str = moment(task.date).format($scope.DATE_FORMAT);
      $scope.sortTasks();
      $scope.saveData();
    }
  };

  $scope.markTimeless = function(task) {
    task.date = '';
    task.date_str = '';
    $scope.saveData();
  };

  $scope.postponeTask = function(task) {
    var task_date;
    var now = new Date();
    if (!task.is_timeless) {
      task_date = new Date(task.date);
      if (now > task_date) {
        task_date = now;
      }
      task.date = task_date.add(1).hours();
      task.date_str = moment(task.date).format($scope.DATE_FORMAT);
      $scope.sortTasks();
      $scope.saveData();
    }
  };

  $scope.markDone = function(task) {
    task.done = true;
    $scope.saveData();
  };

  $scope.editAdditionalData = function() {
    if ($scope.editing_task) {
      var modalInstance = $modal.open({
        templateUrl: 'taskData.html',
        controller: 'TaskDataCtrl',
        resolve: {
          task: function () {
            return $scope.editing_task;
          }
        }
      });

      modalInstance.result.then(function (task) {
        $scope.editing_task.note = task.note;
        $scope.editing_task.url = task.url;
        $scope.addTask();
      });
    }
  };

  setInterval(function() {
    $scope.$digest();
  }, 60 * 1000);

}]);

taskerApp.controller('TaskDataCtrl', function ($scope, $modalInstance, task) {
  $scope.task = task;

  $scope.saveTaskData = function () {
    $modalInstance.close($scope.task);
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
});

taskerApp.directive('taskBlock', function() {
  return {
    scope: false,
    templateUrl: 'taskBlock.html'
  };
});