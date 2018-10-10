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
    var Project = function (projectJSON, gitLabApi, branches, finishedLoadingCallback) {
        this.id = projectJSON.id;
        this.web_url = projectJSON.web_url;
        this.name = projectJSON.name;
        this.branches = branches;
        this.differences = 0;
        this.ABDifferences = 0;
        this.BCDifferences = 0;
        this.gitLabApi = gitLabApi;
        this.ABPending = true;
        this.BCPending = true;
        this.valuesPending = true;
        this.commitsVisible = false;
        this.finishedLoadingCallback = finishedLoadingCallback;
        this.mergeRequestsAB = 0;
        this.mergeRequestsBC = 0;

        /**
         * Updates bound values. This should be called, when this projects state
         * is updated, like branch differences.
         */
        this.updatedValue = function () {
            this.differences = this.ABDifferences + this.BCDifferences;
            this.valuesPending = this.ABPending || this.BCPending;
            if (!this.valuesPending) {
                this.finishedLoadingCallback(this);
            }
        };

        /**
         * Sets the differences between branch A and B and updates dependant values
         * @param value The value to set the difference to
         */
        this.setABDifferences = function (value) {
            this.ABDifferences = value;
            this.ABPending = false;
            this.updatedValue();
        };

        /**
         * Sets the differences between branch B and C and updates dependant values
         * @param value The value to set the difference to
         */
        this.setBCDifferences = function (value) {
            this.BCDifferences = value;
            this.BCPending = false;
            this.updatedValue();
        };

        /**
         * Compares this projects branches and updates the difference values accordingly
         */
        this.compareBranches = function () {
            var project = this;
            this.gitLabApi.compareCall(this.id, this.branches[1], this.branches[0], function (response) {
                project.setABDifferences(response.data.commits.length);
                project.ABCommits = response.data.commits;
            });
            this.gitLabApi.compareCall(this.id, this.branches[2], this.branches[1], function (response) {
                project.setBCDifferences(response.data.commits.length);
                project.BCCommits = response.data.commits;
            });
        };

        /**
         * Toggles the visibility of unmerged commits
         */
        this.toggleCommitVisibility = function () {
            this.commitsVisible = !this.commitsVisible;
        };

        /**
         * Creates a merge request from branch A to B
         */
        this.createMergeRequestAB = function () {
            var project = this;
            this.gitLabApi.createMergeRequest(this.id, this.branches[0], this.branches[1],
                "Merge " + this.branches[0] + " into " + this.branches[1],
                function (response) {
                    project.updateOpenMergeRequests();
                }
            );
        };

        /**
         * Creates a merge request from branch B to C
         */
        this.createMergeRequestBC = function () {
            var project = this;
            this.gitLabApi.createMergeRequest(this.id, this.branches[1], this.branches[2],
                "Merge " + this.branches[1] + " into " + this.branches[2],
                function (response) {
                    project.updateOpenMergeRequests();
                }
            );
        };

        this.updateOpenMergeRequests = function () {
            var project = this;
            this.gitLabApi.getOpenMergeRequests(this.id, function (response) {
                var mergeRequests = response.data;
                var mergeRequestsAB = 0;
                var mergeRequestsBC = 0;
                for (var i in mergeRequests) {
                    var mergeRequest = mergeRequests[i];
                    if (mergeRequest.source_branch == project.branches[0]
                        && mergeRequest.target_branch == project.branches[1]) {
                        mergeRequestsAB += 1;
                    }
                    if (mergeRequest.source_branch == project.branches[1]
                        && mergeRequest.target_branch == project.branches[2]) {
                        mergeRequestsBC += 1;
                    }
                }
                project.mergeRequestsAB = mergeRequestsAB;
                project.mergeRequestsBC = mergeRequestsBC;
            });
        };

        // compare branches on project object creation
        this.compareBranches();

        // also, update the merge request count
        this.updateOpenMergeRequests();
    };

    app.controller("birdsEyeController", function ($http, $q, $uibModal) {
        var ctrl = this;
        this.gitLabApi = new GitLabApi($http, $q, birdsEyeConfig.gitLabAddress, birdsEyeConfig.privateToken);
        this.finishedLoadingProjectsCount = 0;
        this.visibleProjects = 0;
        this.branchConfigError = birdsEyeConfig.branches.length != 3;
        this.filterMergableProjects = true;
        if (!this.branchConfigError) {
            this.gitLabApi.getProjects(function (projects) {
                ctrl.projects = [];
                ctrl.projectsCount = projects.length;
                // create a project object for each project in the response

                projects
                    .forEach(function (project) {
                        var p = new Project(project, ctrl.gitLabApi, birdsEyeConfig.branches, function (fetchedProject) {
                            ctrl.finishedLoadingProjectsCount += 1;
                            if (fetchedProject.differences > 0) {
                                ctrl.visibleProjects += 1;
                            }
                        });
                        ctrl.projects.push(p);
                    });

            }, function (response) {
                if (response.status == 401) {
                    // unauthorized, private token is missing or wrong
                    ctrl.unauthorized = true;
                }
            });
        }
        this.help = function () {
            $uibModal.open({
                animation: true,
                size: 'lg',
                templateUrl: 'html/help.html'
            });
        };
        this.toggleFilterMergableProjects = function () {
            this.filterMergableProjects = !this.filterMergableProjects;
        }
    });

})();
