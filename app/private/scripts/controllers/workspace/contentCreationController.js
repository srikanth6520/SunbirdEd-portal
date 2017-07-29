'use strict';

/**
 * @ngdoc function
 * @name playerApp.controller:ContentCreationController
 * @description
 * # CreatecontentCtrl
 * Controller of the playerApp
 */
angular.module('playerApp')
    .controller('ContentCreationController', ['contentService', 'config', '$scope', '$state',
        '$timeout', '$rootScope', 'toasterService', function (contentService, config, $scope,
            $state, $timeout, $rootScope, toasterService) {
            var contentCreation = this;
            contentCreation.contentUploadUrl = config.URL.BASE_PREFIX + config.URL.CONTENT_PREFIX
                                                                        + config.URL.CONTENT.UPLOAD;

            contentCreation.mimeType = [
                { name: 'Pdf', value: 'application/pdf' },
                { name: 'Video', value: 'video/mp4' },
                { name: 'Html Archive', value: 'application/vnd.ekstep.html-archive' }
            ];
            contentCreation.youtubeVideoMimeType = {
                name: 'Youtube Video', value: 'video/youtube'
            };
            contentCreation.lessonTypes = config.DROPDOWN.COMMON.lessonTypes;
            contentCreation.showContentCreationModal = true;
            contentCreation.userId = $rootScope.userId;
            contentCreation.data = {};
            contentCreation.defaultName = 'Untitled';
            contentCreation.defaultContentType = 'Story';

            $timeout(function () {
                contentCreation.manualUploader = new qq.FineUploader({
                    element: document.getElementById('fine-uploader-manual-trigger'),
                    template: 'qq-template-manual-trigger',
                    request: {
                        endpoint: contentCreation.contentUploadUrl + '/' + contentCreation.contentId
                    },
                    // thumbnails: {
                    //     placeholders: {
                    //         waitingPath: '/source/placeholders/waiting-generic.png',
                    //         notAvailablePath: '/source/placeholders/not_available-generic.png'
                    //     }
                    // },
                    autoUpload: false,
                    debug: true,
                    validation: {
                        acceptFiles: config.FileExtensionToUpload,
                        sizeLimit: config.MaxFileSizeToUpload,
                        allowedExtensions: config.AllowedFileExtension
                    },
                    messages: {
                        sizeError: '{file}' + $rootScope.errorMessages.COMMON.INVALID_FILE_SIZE +
                                                config.MaxFileSizeToUpload / (1000 * 1024) + ' MB.'
                    },
                    callbacks: {
                        onComplete: function (id, name, responseJSON) {
                            if (responseJSON.success) {
                                contentCreation.editContent(contentCreation.contentId);
                            }
                        },
                        onSubmitted: function (id) {
                            contentCreation.youtubeVideoUrl = '';
                            contentCreation.showContentCreationModal = true;
                            contentCreation.uploadedFileId = id;
                            contentCreation.initializeModal();
                            document.getElementById('hide-section-with-button')
                                                    .style.display = 'none';
                        },
                        onCancel: function () {
                            document.getElementById('hide-section-with-button')
                                                    .style.display = 'block';
                        },
                        onStatusChange: function (id, oldStatus, newStatus) {
                            if (newStatus === 'rejected') {
                                document.getElementById('hide-progress-bar-on-reject')
                                                    .style.display = 'none';
                            }
                        }
                    }
                });
                $('#fileUploadOptions').text($rootScope.labels.WORKSPACE.startCreating
                                                                    .fileUploadOptions);

                window.cancelUploadFile = function () {
                    document.getElementById('hide-section-with-button').style.display = 'block';
                };
            }, 100);

            contentCreation.editContent = function (contentId) {
                var params = { contentId: contentId };
                $state.go('EditContent', params);
            };

            contentCreation.hideContentCreationModal = function () {
                $('#contentCreationModal').modal('hide');
                $('#contentCreationModal').modal('hide others');
                $('#contentCreationModal').modal('hide dimmer');
            };

            contentCreation.clearContentCreationModal = function () {
                if (contentCreation.createApi) {
                    contentCreation.createApi.error = {};
                }
                contentCreation.data = {};
            };

            contentCreation.closeContentCreationModal = function () {
                $timeout(function () {
                    contentCreation.showContentCreationModal = false;
                }, 0);
            };

            contentCreation.initializeModal = function () {
                $timeout(function () {
                    $('#contentCreationModal').modal({
                        onShow: function () {
                            contentCreation.clearContentCreationModal();
                        },
                        onHide: function () {
                            if (!contentCreation.contentId && !contentCreation.youtubeVideoUrl) {
                                document.getElementById('hide-section-with-button')
                                                        .style.display = 'block';
                                contentCreation.manualUploader.cancel(contentCreation
                                                                                .uploadedFileId);
                            } else {
                                contentCreation.youtubeVideoUrl = '';
                            }
                            contentCreation.clearContentCreationModal();
                            contentCreation.closeContentCreationModal();
                        }
                    }).modal('show');
                    $('#lessonTypeDropDown').dropdown('restore defaults');
                    $('#mimeTypeDropDown').dropdown('restore defaults');

                    if (contentCreation.youtubeVideoUrl) {
                        $('#mimeTypeDropDown').dropdown('set text', 'Youtube Video');
                        $('#mimeTypeDropDown').dropdown('destroy');
                    }
                }, 10);
            };

            contentCreation.createContent = function (requestData) {
                contentCreation.loader = toasterService.loader('', $rootScope.errorMessages
                                                                .WORKSPACE.UPLOAD_CONTENT.START);
                contentService.create(requestData).then(function (res) {
                    if (res && res.responseCode === 'OK') {
                        contentCreation.loader.showLoader = false;
                        contentCreation.contentId = res.result.content_id;
                        contentCreation.hideContentCreationModal();
                        if (contentCreation.youtubeVideoUrl) {
                            contentCreation.youtubeVideoUrl = '';
                            contentCreation.editContent(res.result.content_id);
                        } else {
                            contentCreation.uploadContent(res.result.content_id);
                        }
                    } else {
                        contentCreation.loader.showLoader = false;
                        toasterService.error($rootScope.errorMessages.WORKSPACE.UPLOAD_CONTENT
                                                                                        .FAILED);
                    }
                }).catch(function () {
                    contentCreation.loader.showLoader = false;
                    toasterService.error($rootScope.errorMessages.WORKSPACE.UPLOAD_CONTENT.FAILED);
                });
            };

            contentCreation.saveMetaData = function (data) {
                var requestBody = angular.copy(data);
                requestBody.createdBy = contentCreation.userId;
                requestBody.name = requestBody.name ? requestBody.name
                                                            : contentCreation.defaultName;
                requestBody.contentType = requestBody.contentType ? requestBody.contentType
                                                            : contentCreation.defaultContentType;
                if (contentCreation.youtubeVideoUrl) {
                    requestBody.mimeType = contentCreation.youtubeVideoMimeType.value;
                    requestBody.artifactUrl = contentCreation.youtubeVideoUrl;
                } else {
                    requestBody.mimeType = requestBody.mimeType.value;
                }

                var requestData = {
                    content: requestBody
                };
                contentCreation.createContent(requestData);
            };

            contentCreation.uploadContent = function () {
                var endpoint = contentCreation.contentUploadUrl + '/' + contentCreation.contentId;
                contentCreation.manualUploader.setEndpoint(endpoint,
                                                                contentCreation.uploadedFileId);
                contentCreation.manualUploader.uploadStoredFiles();
            };

            contentCreation.uploadYoutubeFile = function () {
                contentCreation.initializeModal();
            };

            contentCreation.validateYouTubeUrl = function (url) {
                contentCreation.invalidYoutubeVideoUrl = false;
                if (url !== undefined && url !== '') {
                    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|\?v=)([^#\&\?]*).*/; //eslint-disable-line
                    var match = url.match(regExp);
                    if (match && match.length > 1 && match[2].length === 11) {
                        contentCreation.youtubeVideoUrl = 'https://www.youtube.com/embed/' +
                                                            match[2] + '?autoplay=1&enablejsapi=1';
                        contentCreation.invalidYoutubeVideoUrl = false;
                    } else {
                        contentCreation.invalidYoutubeVideoUrl = true;
                    }
                } else {
                    contentCreation.invalidYoutubeVideoUrl = true;
                }
            };
        }]);
