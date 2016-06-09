/**
 * Created by benedikt.ringlein on 06.06.2016.
 */
(function () {
    var app = angular.module("app", ['ngAnimate', 'ui.bootstrap']);

    /**
     * A GitLab project object, as a view model for project panels
     * @param projectJSON The JSON object from an GitLab API call that represents the project
     * @param gitLabApi The GitLabApi connector
     * @param finishedLoadingCallback A callback for when the project finished loading its data
     * @constructor
     */
    var Project = function (projectJSON, gitLabApi, finishedLoadingCallback) {
        this.id = projectJSON.id;
        this.web_url = projectJSON.web_url;
        this.name = projectJSON.name;
        this.differences = 0;
        this.develop_release = 0;
        this.release_master = 0;
        this.gitLabApi = gitLabApi;
        this.developReleasePending = true;
        this.releaseMasterPending = true;
        this.valuesPending = true;
        this.commitsVisible = false;
        this.finishedLoadingCallback = finishedLoadingCallback;
        this.mergeRequestsDevelopRelease = 0;
        this.mergeRequestsReleaseMaster = 0;

        /**
         * Updates bound values. This should be called, when this projects state
         * is updated, like branch differences.
         */
        this.updatedValue = function () {
            this.differences = this.develop_release + this.release_master;
            this.valuesPending = this.developReleasePending || this.releaseMasterPending;
            if (!this.valuesPending) {
                this.finishedLoadingCallback(this);
            }
        };

        /**
         * Sets the differences between develop and release branch and updates dependant values
         * @param value The value to set the difference to
         */
        this.setDevelopRelease = function (value) {
            this.develop_release = value;
            this.developReleasePending = false;
            this.updatedValue();
        };

        /**
         * Sets the differences between release and master branch and updates dependant values
         * @param value The value to set the difference to
         */
        this.setReleaseMaster = function (value) {
            this.release_master = value;
            this.releaseMasterPending = false;
            this.updatedValue();
        };

        /**
         * Compares this projects branches and updates the difference values accordingly
         */
        this.compareBranches = function () {
            var project = this;
            this.gitLabApi.compareCall(this.id, 'release', 'develop', function (response) {
                project.setDevelopRelease(response.data.commits.length);
                project.developReleaseCommits = response.data.commits;
            });
            this.gitLabApi.compareCall(this.id, 'master', 'release', function (response) {
                project.setReleaseMaster(response.data.commits.length);
                project.releaseMasterCommits = response.data.commits;
            });
        };

        /**
         * Toggles the visibility of unmerged commits
         */
        this.toggleCommitVisibility = function () {
            this.commitsVisible = !this.commitsVisible;
        };

        /**
         * Creates a merge request from develop to release branch
         */
        this.createMergeRequestDevelopRelease = function () {
            var project = this;
            this.gitLabApi.createMergeRequest(this.id, "develop", "release", "Merge Develop into Release",
                function (response) {
                    project.updateOpenMergeRequests();
                }
            );
        };

        /**
         * Creates a merge request from release to master branch
         */
        this.createMergeRequestReleaseMaster = function () {
            var project = this;
            this.gitLabApi.createMergeRequest(this.id, "release", "master", "Merge Release into Master",
                function (response) {
                    project.updateOpenMergeRequests();
                }
            );
        };

        this.updateOpenMergeRequests = function () {
            var project = this;
            this.gitLabApi.getOpenMergeRequests(this.id, function (response) {
                var mergeRequests = response.data;
                var mergeRequestsDevelopRelease = 0;
                var mergeRequestsReleaseMaster = 0;
                var i = 0;
                for (i in mergeRequests) {
                    var mergeRequest = mergeRequests[i];
                    if (mergeRequest.source_branch == "develop" && mergeRequest.target_branch == "release") {
                        mergeRequestsDevelopRelease += 1;
                    }
                    if (mergeRequest.source_branch == "release" && mergeRequest.target_branch == "master") {
                        mergeRequestsReleaseMaster += 1;
                    }
                }
                project.mergeRequestsDevelopRelease = mergeRequestsDevelopRelease;
                project.mergeRequestsReleaseMaster = mergeRequestsReleaseMaster;
            });
        };

        // compare branches on project object creation
        this.compareBranches();

        // also, update the merge request count
        this.updateOpenMergeRequests();
    };

    app.controller("birdsEyeController", function ($http, $uibModal) {
        var ctrl = this;
        this.gitLabApi = new GitLabApi($http, birdsEyeConfig.gitLabAddress, birdsEyeConfig.privateToken);
        this.finishedLoadingProjectsCount = 0;
        this.visibleProjects = 0;
        this.gitLabApi.getProjects(function (response) {
            ctrl.projects = [];
            ctrl.projectsCount = response.data.length;
            // create a project object for each project in the response
            var i;
            for (i in response.data) {
                var responseData = response.data[i];
                var p = new Project(responseData, ctrl.gitLabApi, function (project) {
                    ctrl.finishedLoadingProjectsCount += 1;
                    if (project.differences > 0) {
                        ctrl.visibleProjects += 1;
                    }
                });
                ctrl.projects.push(p);
            }
        }, function (response) {
            if (response.status == 401) {
                // unauthorized, private token is missing or wrong
                ctrl.unauthorized = true;
            }
        });
        this.help = function () {
            $uibModal.open({
                animation: true,
                size: 'lg',
                templateUrl: 'html/help.html'
            });
        };
    });

})();