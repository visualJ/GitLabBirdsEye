/**
 * Created by benedikt.ringlein on 09.06.2016.
 */
(function () {
    var app = angular.module("app");

    app.directive("project", function () {
        return {
            restrict: "E",
            replace: true,
            templateUrl: "html/project.html"
        };
    });

    // this is an attribute directive, because element directives don't work well on <tr> in tables
    app.directive("commitListItem", function () {
        return {
            restrict: "A",
            replace: true,
            templateUrl: "html/commit-list-item.html"
        };
    });

    app.directive("commitList", function () {
        return {
            restrict: "E",
            replace: true,
            templateUrl: "html/commit-list.html"
        };
    });

})();