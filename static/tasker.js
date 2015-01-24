var taskerApp = angular.module('taskerApp', ['ngRoute']);

taskerApp.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
    when('/profile', {
      templateUrl: 'profile.html',
      controller: 'ProfileCtrl'
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
}]);

taskerApp.controller('TasksCtrl', ['$scope', '$rootScope', function($scope, $rootScope) {
  $rootScope.menu_section = 'tasks';

  var tasks_data = localStorage.getItem('utasker_tasks');
  if (tasks_data) {
    $scope.tasks = JSON.parse(tasks_data);
  } else {
    $scope.tasks = [];
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
  }

  $scope.sortTasks();

  $scope.DATE_FORMAT = 'YYYY MM DD';

  $scope.today_date = moment(new Date().add(0).days()).format('dddd MMM D')
  $scope.tomorrow_date = moment(new Date().add(1).days()).format('dddd MMM D')

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
        if (column == 'today') {
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
          t.from_now = moment(task_date).format('D MMMM');
        }
      }

      return t
    });
  };

  $scope.getTasksToday = function() {
    var today = Date.today();
    var today_str = moment(today).format($scope.DATE_FORMAT);
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return new Date(task.date) <= today || today_str == task.date_str;
    }), 'today');
  };

  $scope.getTasksTomorrow = function() {
    var tomorrow = Date.today().add(1).days();
    var tomorrow_str = moment(tomorrow).format($scope.DATE_FORMAT);
    return $scope.augmentTasks(_.where($scope.tasks, {date_str: tomorrow_str}), 'tomorrow');
  };

  $scope.getTasksIncoming = function() {
    var limit_date = Date.today().add(1).days().set({ hour: 23, minute: 59 });
    return $scope.augmentTasks(_.filter($scope.tasks, function(task) {
      return new Date(task.date) > limit_date;
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
    var task_date = Date.parse(bit);
    var next_task_date;
    var now = new Date();
    if (task_date) {
      if (task_date < now) {
        next_task_date = Date.parse('Next ' + bit);
        if (next_task_date && next_task_date >= now) {
          task_date = next_task_date;
        } else {
          task_date = new Date().add(1).hours();
        }
      }
      $scope.new_task_data.date = task_date;
      $scope.new_task_data.date_str = moment(task_date).format($scope.DATE_FORMAT);
    }
  };

  $scope.saveData = function() {
    localStorage.setItem('utasker_tasks', angular.toJson($scope.tasks));
  };

  $scope.$watchCollection('tasks', function() {
    $scope.saveData();
  });

  $scope.$watch('tasks', function() {
    $scope.saveData();
  });

  $scope.addTask = function() {
    var bits = _.map($scope.new_task_string.split('@'), function(s) {
      return s.trim();
    });
    $scope.new_task_data.title = bits[0];
    if (bits.length == 2) {
      $scope.parseDate(bits[1]);
      if (!$scope.new_task_data.date) {
        $scope.new_task_data.project = bits[1];
      }
    }
    if (bits.length == 3) {
      $scope.parseDate(bits[2]);
      $scope.new_task_data.project = bits[1];
    }
    $scope.tasks.push($scope.new_task_data);
    $scope.new_task_string = '';
    $scope.new_task_data = {};
    $scope.sortTasks();
  };

  $scope.deleteTask = function(task) {
    $scope.tasks = _.reject($scope.tasks, function(t) {
      return t == task;
    });
  };

  $scope.moveRight = function(task) {
    var task_date;
    if (!task.is_timeless) {
      task_date = new Date(task.date);
      task.date = task_date.add(1).days();
      task.date_str = moment(task.date).format($scope.DATE_FORMAT);
      $scope.sortTasks();
      $scope.saveData();
    }
  };

  $scope.moveLeft = function(task) {
    var task_date;
    if (!task.is_timeless && !task.is_today) {
      task_date = new Date(task.date);
      task.date = task_date.add(-1).days();
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

}]);

taskerApp.directive('taskBlock', function() {
  return {
    scope: false,
    templateUrl: 'taskBlock.html'
  };
});