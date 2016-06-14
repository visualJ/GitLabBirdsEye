/**
 * Created by benedikt.ringlein on 06.06.2016.
 */
function GitLabApi($http, gitLabAddress, privateToken) {
    this.$http = $http;
    this.gitLabAddress = gitLabAddress;
    this.privateToken = privateToken;

    /**
     * Builds a request url. This adds the GitLab address, the api version and the private token
     * @param request The request string without GitLab address, token, parameters and /api/v3 e.g. 'projects'
     * @param parameters The GET parameters or null
     * @returns {string} A ready-to-use url for an API call
     */
    this.getRequestUrl = function (request, parameters) {
        var url = this.gitLabAddress + '/api/v3/' + request + '?private_token=' + this.privateToken + '&per_page=100';
        if (parameters != null) {
            url += '&' + parameters;
        }
        return url;
    };

    /**
     * Retrieves all available projects
     * @param callback callback for successful response
     * @param errorCallback callback for errors
     */
    this.getProjects = function (callback, errorCallback) {
        this.$http({
            method: 'GET',
            url: this.getRequestUrl('projects', null)
        }).then(callback, errorCallback);
    };

    /**
     * Compares two branches of a project
     * @param id The project id
     * @param from Branch name to compare from
     * @param to Branch name to compare to
     * @param callback Callback for successful response
     */
    this.compareCall = function (id, from, to, callback) {
        this.$http({
            method: 'GET',
            url: this.getRequestUrl('projects/' + id + '/repository/compare', 'from=' + from + '&to=' + to)
        }).then(callback);
    };

    /**
     * Creates a merge request for two branches in a project
     * @param id The project id
     * @param sourceBranch The source branch name
     * @param targetBranch The target branch name to merge into
     * @param title The title for the created merge request
     * @param callback A callback for a successful response
     */
    this.createMergeRequest = function (id, sourceBranch, targetBranch, title, callback) {
        var test = this;
        this.$http({
            method: 'POST',
            url: this.getRequestUrl('projects/' + id + '/merge_requests', 'source_branch=' + sourceBranch
                + '&target_branch=' + targetBranch + '&title=' + title)
        }).then(callback);
    };

    /**
     * Retrieves opened merge requests in a project
     * @param id The project id
     * @param callback A callback for a successful response
     */
    this.getOpenMergeRequests = function(id, callback){
        this.$http({
            method: 'GET',
            url: this.getRequestUrl('projects/' + id + '/merge_requests', 'state=opened')
        }).then(callback);
    };

}