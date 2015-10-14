// Global Zzish object
(function () {


    Zzish = {};

/**** FRONT END JAVASCRIPT STUFF (WITH STATE) ***/

//STATE THAT NEEDS TO BE TRACK PER USER (ON THE CLIENT SIDE)

    //appConfig
    var appConfig;
    //tracks this device
    var deviceId;
    //tracks a session (resets when a new user is selected)
    var sessionId;
    //the app Id (sandbox or production) generated from developer console (https://developer.zzish.com)
    var appId;
    //keep track of the current user (so we know when session needs to be updated)
    var currentUser = null;

    //store for storage
    var dataStorage = {};


/**** CONFIGURATION ******/

    var defaultProtocol = "https://";
    var baseUrl = "api.zzish.com/";
    var webUrl = "https://www.zzish.com/";
    var logEnabled = false;
    var header = "Authorization";
    var headerprefix = "Bearer ";
    var makeStateless = false;

    var getDataValue = function(key) {
        if (dataStorage[key]) {
            return dataStorage[key];
        }
        try {
            if (typeof localStorage !== "undefined") {
                return localStorage.getItem(key);
            }
        }
        catch (err) {

        }
        return undefined;
    };

    var setDataValue = function(key, value) {
        dataStorage[key] = value;
        try {
            if (typeof localStorage !== "undefined") {
                return localStorage.setItem(key, value);
            }
        }
        catch (err) {

        }
    };

    var removeDataValue = function(key) {
        delete dataStorage[key];
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.removeItem(key);
            }
        }
        catch (err) {

        }
    };

    var clearDataValue = function() {
        for (var i in dataStorage) {
            delete dataStorage[i];
        }
        try {
            if (typeof localStorage !== "undefined") {
                localStorage.clear();
            }
        }
        catch (err) {

        }
    };

    /**
     * Checks to see if localStorage is defined. Then it's a stateful session
     */
    function stateful() {
        //if localstorage is not defined
        if (makeStateless) return false;
        return (typeof localStorage != 'undefined');
    }


    function getBaseUrl() {
        if (stateful() && window !== undefined && window.location !== undefined && window.location.href !== undefined) {
            var url = window.location.href;
            if (url!=undefined) {
                var arr = url.split("/");
                if (arr[0]=="file:") arr[0] = "http:";
                return arr[0] + "//" + baseUrl;
            }
        }
        return defaultProtocol + baseUrl;
    }


    function getQueryParams() {
        var params = {}, tokens,
            re = /[?&]?([^=]+)=([^&]*)/g;
        try {
            var qs = "";
            if (location.search!="") {
                qs = location.search;
            }
            else if (location.hash!="") {
                qs = location.hash;
                indexOf = qs.indexOf("?");
                qs = qs.substring(indexOf+1);
            }
            qs = qs.split("+").join(" ");
            while (tokens = re.exec(qs)) {
                params[decodeURIComponent(tokens[1])]
                    = decodeURIComponent(tokens[2]);
            }
        }
        catch (err) {

        }
        return params;
    }

    function getConfigValue(config,field,originalValue) {
        if (config[field]!=undefined) return config[field];
        return originalValue;
    }

    /**
     * Initialise Zzish instance
     */
    Zzish.init = function (config) {
        //generate a device if we don't have one
        appConfig = config;
        deviceId = getDataValue("deviceId");
        if (deviceId == null) {
            deviceId = v4();
            setDataValue("deviceId", deviceId);
        }
        if (typeof config =='string') {
            try
            {
                config = JSON.parse(config);
                Zzish.init(config);
            }
            catch (err) {
                appId = config;
                setDataValue("appConfig",config);
            }

        }
        else if (typeof config =='object') {
            appId = getConfigValue(config,'api');
            defaultProtocol = getConfigValue(config,'protocol',defaultProtocol);
            baseUrl = getConfigValue(config,'baseUrl',baseUrl);
            webUrl = getConfigValue(config,'webUrl',webUrl);
            header = getConfigValue(config,'header',header);
            headerprefix = getConfigValue(config,'headerprefix',headerprefix);
            logEnabled = getConfigValue(config,'logEnabled',logEnabled);
            setDataValue("appConfig",JSON.stringify(config));
        }
    };


    var params = getQueryParams();
    if (params["zzishtoken"]!=null) {
        Zzish.init(params["zzishtoken"]);
    }
    if (params["cancel"]!=undefined) {
        removeDataValue("token");
    }



/**** SERVER SIDE (NO STATE) *****/

    /**
     * Presets the deviceId and SessionId which the developer stores if there is not state to store that info
     */
    Zzish.initState = function(iDeviceId,iSessionId) {
        deviceId = iDeviceId;
        sessionId = iSessionId;
        return zzish;
    };

/**** CLIENT SIDE (REQUIRE STATE) *****/

    /**
     * Get the User (if the id is the same as the current one, returns the current user)
     *
     * @param id - A unique Id for the user (required)
     * @param name - The name of the user (optional)
     * @param callback - An optional callback after user has been saved on server
     * @return The user (returns a server user if it already exists). If it's the current User, returns that user
     */
    Zzish.getUser = function (id, name, callback) {
        if (id==undefined) id = v4();
        if (stateful()) {
            //that means we have a front end service so we can check state
            if (currentUser==undefined || currentUser.id != id) {
                sessionId = v4();
                Zzish.createUser(id,name,function(err,message) {
                    if (!err) {
                        //set the current user if we don't have an error
                        currentUser = message;
                    }
                    callCallBack(err, {status: 200, payload: message}, callback);
                });
            }
            else {
                callCallBack(null, {status: 200, payload: currentUser}, callback);
            }
        }
        else {
            Zzish.createUser(id,name,callback);
        }
    };

    /**
     * Get the User by the zzish user code
     *
     * @param code - Their zzish user code
     * @param callback - An optional callback after user has been saved on server
     * @return The user (returns a server user if it already exists). If it's the current User, returns that user
     */
    Zzish.getUserByCode = function (code, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/code/" + code
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Get a list of users
     *
     * @param ids - A unique Id for the user (required)
     * @param callback - An optional callback after user has been saved on server
     * @return The user (returns a server user if it already exists). If it's the current User, returns that user
     */
    Zzish.getUsers = function (ids, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/list/" + encodeURIComponent(ids.join(";"))
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Save the User (if the id is the same as the current one, returns the current user)
     *
     * @param id - A unique Id for the user (required)
     * @param user - The user object to save
     * @param callback - An optional callback after user has been saved on server
     * @return The user (returns a server user if it already exists). If it's the current User, returns that user
     */
    Zzish.saveUser = function (id, user, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles",
            data: user
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Create a Zzish group for a user
     *
     * @param id - A unique Id for the user (required)
     * @param group - The group object to save
     * @param callback - An optional callback after user has been saved on server
     * @return The group (returns a server user if it already exists). If it's the current User, returns that user
     */
    Zzish.saveGroup = function (id, group, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + id  + "/groups",
            data: group
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };


    /**
     * Create a game
     *
     * @param userId - The userId of the user (required)
     * @param game - The game Object (required)
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The game uuid
     */
    Zzish.createGame = function (userId, game, callback) {
        if (game.uuid === undefined) {
            game.uuid = v4();
        }
        var request = {
            method: "POST",
            url: getBaseUrl() + "statements/" + userId + "/games",
            data: game
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
        return game.uuid;
    };

    /**
     * Get results of a game
     *
     * @param gameId - The Game uuid
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The game uuid
     */
    Zzish.getGameActivities = function (userId,gameId, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "statements/" + userId + "/games/" + gameId + "/activities"
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Get activity result
     *
     * @param gameId - The Game uuid
     * @param uuid - The Activity uuid
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The game uuid
     */
    Zzish.getGameActivity = function (userId,gameId, uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "statements/" + userId + "/games/" + gameId + "/activities/" + uuid
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Start Activity with name
     *
     * @param userId - The userId of the user (required)
     * @param activityName - The name of the activity (required)
     * @param code - The Zzish Class Code when creating a class in the learning hub (optional)
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The activity zzish
     */
    Zzish.startActivity = function (userId, activityName, code, callback) {
        var parameters = {
            activityDefinition: {
                type: activityName
            },
            extensions: {
                groupCode: code
            }
        }
        return Zzish.startActivityWithObjects(userId,parameters, callback);
    };

    /**
     * Start Activity with name
     *
     * @param userId - The userId of the user (required)
     * @param parameters - The parameters Object which contains various configurations of the activity
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The activity zzish
     */
    Zzish.startActivityWithObjects = function (userId, parameters, callback) {
        if (!currentUser || !stateful() || userId!=currentUser.id) {
            currentUser = {
                uuid: userId
            }
        };
        aid = v4();
        var message = {
            verb: "http://activitystrea.ms/schema/1.0/start",
            activityUuid: aid
        };
        sendMessage(message, parameters,callback);
        return aid;
    };

    /**
     * stop Activity with aid
     *
     * @param activityId - The activity id (returned from startActivity) (required)
     * @param states - A string represented JSON of attributes to save for this activity (optional)
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.stopActivity = function (activityId, states, callback) {
        var pro = undefined;
        var haveState = false;
        if (states!=undefined && states.proficiency!=undefined) {
            pro = states.proficiency;
            delete states.proficiency;
        }
        var stateMap = {
            states: states
        }
        if (pro!=undefined) {
            stateMap.proficiency = pro;
            haveState = true;
        }
        for (i in states) {
            haveState = true;
        }
        sendMessage({
             verb: "http://activitystrea.ms/schema/1.0/complete",
             activityUuid: activityId
        }, { states: haveState?stateMap:undefined},callback)
    };

    /**
     * Cancel Activity with aid
     *
     * @param activityId - The activity id (returned from startActivity) (required)
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.cancelActivity = function (activityId, callback) {
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/cancel",
            activityUuid: activityId
        }, {}, callback)
    };

    /**
     * Log an Action
     *
     * @param activityId - The activity id (returned from startActivity) (required)
     * @param actionName - The name of the action (required)
     * @param response - A string representation of the action (optional)
     * @param score - A float score (optional)
     * @param duration - A long duration (optional)
     * @param attempts - The number of attempts
     * @param attributes - JSON Attributes
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.logAction = function (activityId, actionName, response, score, correct, duration, attempts, attributes, callback) {
        var definition = {
            type: actionName
        };
        var result = {};
        if (response != undefined) {
            result["response"] = response;
        }
        if (score != undefined) {
            result["score"] = parseFloat(score);
        }
        if (correct != undefined) {
            result["correct"] = correct;
        }
        if (duration != undefined) {
            result["duration"] = parseInt(duration);
        }
        if (attempts != undefined) {
            result["attempts"] = parseInt(attempts);
        }
        Zzish.logActionWithObjects(activityId,{definition:definition, result: result},callback);
    };

    Zzish.logActionWithObjects = function (activityId, parameters, callback) {
        if (parameters.definition==undefined) {
            parameters.definition = {};
        }
        var action = createActionObject(parameters);
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/start",
            activityUuid: activityId,
            actions: [action]
        }, parameters, callback);
    }

    function createActionObject(parameters) {
        var action = parameters.result;
        if (action==undefined) {
            action = {};
        }
        action.definition = parameters.definition;
        if (parameters.attributes != undefined && parameters.attributes != "") {
            action.state = {};
            if (parameters.attributes["proficiency"]!=undefined) {
                proficiency = parameters.attributes["proficiency"];
                delete parameters.attributes["proficiency"];
                action.state["proficiency"]=proficiency;
            }
            var found = false;
            for (i in parameters.attributes) {
                found = true;
            }
            if (found) {
                if (typeof(parameters.attributes) == 'string') {
                    action.state["attributes"] = JSON.parse(parameters.attributes);
                }
                else {
                    action.state["attributes"] = parameters.attributes;
                }
            }
        }
        return action;
    }

    Zzish.logActions = function (activity, parameters, actionObjects, callback) {
        var actions = actionObjects.map(function(action) {
            return createActionObject(action);
        });
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/start",
            activityUuid: activityId,
            actions: actions
        }, parameters, callback);
    }

    /**
     * send message to REST API
     *
     * @param data - A partial tincan statement
     * @param callback - An optional callback to call when done (returns error,message)
     *
     */
    var sendMessage = function (data, parameters, callback) {
        if (currentUser) {
        data.userUuid = currentUser.uuid;
        }
        if (parameters.extensions==undefined) {
            parameters.extensions = {};
        }
        parameters.extensions["deviceId"] = deviceId;
        parameters.extensions["sessionId"] = sessionId;
        var message = buildSimulationMessage(data,parameters);
        var headers = {
            'Content-Type': 'application/json'
        };
        headers[header] = headerprefix + appId;
        if (logEnabled) console.log("Sending" + JSON.stringify(message));
        var request = {
            method: "POST",
            url: getBaseUrl() + "statements",
            data: message
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Build an (extended) TinCan statement
     * @param data
     * @returns partially built TinCan message
     */
    var buildSimulationMessage = function (data,parameters) {
        if (parameters.activityDefinition==undefined) {
            parameters.activityDefinition = {};
        }
        var message = {
            actor: {
                account: {
                    homePage: "http://www.zzish.com/" + appId,
                    name: data.userUuid
                }
            },
            verb: {
                id: data.verb
            },
            object: {
                definition: parameters.activityDefinition
            },
            id: data.activityUuid,
            context: {
                extensions: {}
            }
        };
        if (parameters.states!=undefined) {
            message.object.state = parameters.states;
        }
        if (parameters.extensions) {
            for (i in parameters.extensions) {
                message.context.extensions["http://www.zzish.com/context/extension/"+i] = parameters.extensions[i];
            }
        }
        if (data.actions!=undefined) {
            message.actions = data.actions;
        }
        return message;
    };



    /**
     * Simple replaceAll method
     *
     * @param find - What to find
     * @param replace - What to replace with
     * @param str - The string to search
     * @return The result after the replace is done
     */
    function replaceAll(find, replace, str) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    /**
     * Helper method to call callback
     * err - error response from making call
     * data - response from making call
     * callback - callback method
     */
    function callCallBack(err, data, callback) {
        //check if callback exists
        if (callback != undefined) {
            if (err != undefined) {
                //an error has ocurred when trying to get response
                callback(err.status, err.message);
            }
            else if (data != undefined) {
                //check if api returns 200
                if (data.status == 200) {
                    //return payload as message will be null
                    callback(undefined, data.payload);
                }
                else {
                    //return message
                    callback(data.status, data.message);
                }
            }
            else {
                callback(400, "Zzish error");
            }
        }
    }

/**** BACK END STUFF TO SEND DATA ***/

/**** LOGINSTUFF ***/

    /**
     * Returns true if it's a valid class code (not necessarily whether it exists)
     *
     * @param code - The Zzish Class code (required)
     */
    Zzish.validateClassCode = function (code) {
        if (code!=undefined && code.length>1) {
            var charLast = code.slice(-1);
            var total = 0;
            for (counter=0;counter<code.length-1;counter++) {
                total+=code.charCodeAt(counter);
            }
            total = total%10;
            if (charLast==total) {
                return true;
            }
        }
        return false;
    };

    /**
     * Authenticate user based on name and classcode.
     * Returns 409 if user has logged in on a different device with the same name
     * within a specied period (see error message for details)
     *
     * @param id - A unique Id for the user (required)
     * @param name - The name of the user (required)
     * @param code - The Zzish Class code (required)
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.authUser = function (id, name, code, callback) {
        var message = {
            uuid : id,
            username : name,
            passwordText: code
        };
        //create new session
        sessionId = uuid.v4();
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/auth",
            data: message
        };
        sendData(request, function (err, data) {
            if (!err) {
                currentUser = data;
            }
            callCallBack(err, data, callback);
        })
    };

    /**
     * Logout a user
     *
     * @param id - A unique Id for the user (required)
     * @param callback - An optional callback after user has been saved on server
     */

    Zzish.unauthUser = function (id,  callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/"+id+"/logout",
            data: {}
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Create a user
     *
     * @param id - A unique Id for the user (required)
     * @param name - The name of the user (optional)
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.createUser = function (id, name, callback) {
        var message = {
            uuid : id,
            name : name
        };
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles",
            data: message
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };


    /**
     * Get List of Groups for user
     *
     * @param profileId - A unique Id for the user (required)
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.listGroups = function (profileId, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/"+profileId+"/groups"
        };
        sendData(request, function (err, data) {
            if (!err) {
                for (var i in data.payload) {
                    var link = replaceAll("/","-----",data.payload[i].link);
                    link = replaceAll("\\\\","=====",link)
                    data.payload[i].link = webUrl + "learning-hub/tclassroom/" + link +"/live";
                }
            }
            callCallBack(err, data, callback);
        })
    };

    /**
     * Get List of Students for Group
     *
     * @param profileId - The owner of the group
     * @param groupCode - The code of the group
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.listStudents = function (profileId, groupCode, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/"+profileId+"/groups/code/"+groupCode+"/students"
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };


    /**
     * Get List of Content assigned to all groups of the profile
     *
     * @param id - A unique Id for the user (required)
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.listGroupContentForProfile = function (id, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/"+id+"/groups/contents",
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };


/**** USER MANAGEMENT *****/

    /**
     * Authenticate based on user and password (which is md5') for app
     * Returns 409 if user has logged in on a different device with the same name
     * within a specied period (see error message for details)
     *
     * @param email - The email of the user
     * @param password - The password of the user
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.authenticate = function (email, password, callback) {
        if ((password==undefined || password =="") && (email=="" || email==undefined)) {
            callback(400,"Email and Password are required");
        }
        else {
            var message = {
                email : email,
                password: password
            };
            var request = {
                method: "POST",
                url: getBaseUrl() + "profiles/authenticate",
                data: message
            };
            sendData(request, function (err, data) {
                callCallBack(err, data, callback);
            })
        }
    };

    /**
     * Gets a user based on the Profile User Id
     *
     * @param uuid - The profile User Id
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.user = function (uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/authenticate/"+uuid,
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Searchs a user by Attributes
     *
     * @param attributes - A set of attributes to search for on user. String key/value pairs
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.userByAttributes = function (attributes, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/search",
            data: attributes
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Creates a user object on the Zzish User Database. Email and password is at least required.
     *
     * @param email - The email of the user
     * @param password - The password of the user
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.registerUser = function (email, password, callback) {
        var message = {
            email : email,
            password: password
        };
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/register",
            data: message
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Update user object on the Zzish User Database
     *
     * @param user - The user object
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.updateUser = function (user, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/update",
            data: user
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Update the user password
     *
     * @param uuid - The user uuid
     * @param password - The password
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.updatePassword = function (uuid, password, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/" + uuid + "/password",
            data: {password: password}
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Authorizes user to log in straight from the developer's app by authorizing the user. An email will be sent
     *
     * @param userId - The Developer User Id
     * @param email - The email of the user
     * @param name - The optional name fo the user
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.registerUserWithZzish = function (userId, email, name, callback) {
        var message = {
            email: email,
            profile: {
                uuid: userId,
                name: name
            }
        };
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/eregister",
            data: message
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Returns a token to be used for accessing Zzish website
     *
     * @param userId - The Developer User Id
     * @param callback - An optional callback after user has been saved on server
     */
    Zzish.getTokenForUser = function (userId, callback) {
        var message = {
            uuid: userId
        };
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/authenticate/token",
            data: message
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function(err, message) {
                var url = webUrl + "account/app/" + message + "/token";
                callback(err, url);
            });
        });
    };

    /**** BACKEND CONTENT STUFF ***/

    /**
     * Save a Zzish content object
     * @param profileId - The id of the profile to which to save the content for
     * @param type - The content type
     * @param uuid - Unique id of the content
     * @param meta - A Json Object of tags associated with the object. Special tags are name, categoryId and code.
     * @param content - The JSON object to save
     * @param callback - An optional callback to call when done (returns error,message)
     */
    Zzish.postContent = function (profileId, type, uuid,meta, content, callback) {
        var data = {
            uuid: uuid,
            meta: meta,
            payload: JSON.stringify(content)
        };
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + uuid,
            data: data
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Delete a Zzish content object
     * @param profileId - The id of the profile to which to save the content for
     * @param type - The content type
     * @param id - The id of the content
     * @param callback - An optional callback to call when done (returns error,message)
     */
    Zzish.deleteContent = function (profileId, type, id, callback) {
        var request = {
            method: "DELETE",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + id
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    var formatContentObject = function(content,includePayload) {
        if (content) {
            var result = {
                uuid: content.uuid,
                meta : content.meta,
                attributes: content.attributes
            };
            if (includePayload && content.payload!==undefined && content.payload!="") {
                result.payload = JSON.parse(content.payload);
            }
            return result;
        }
        return null;
    };

    var formatListContents = function(data,includePayload) {
        var list = [];
        if (data){
            for (var i in data.payload) {
                list.push(formatContentObject(data.payload[i],includePayload));
            }
        }
        return list;
    };

    var formatListCategoryContents = function(data) {
        if (data && data.payload.contents){
            var list = [];
            for (var i in data.payload.contents) {
                var result = formatContentObject(data.payload.contents[i],false);
                list.push(result);
            }
            data.payload.contents = list;
        }
        return data.payload;
    };

    /**
     * Get a Zzish content object
     * @param profileId - The id of the profile to which to get the content for
     * @param type - The content type
     * @param uuid - THe uuid to get
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getContent = function (profileId, type, uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + uuid
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    if (data.payload!==undefined && data.payload!=null) {
                        callback(err,formatContentObject(data.payload,true));
                    }
                    else {
                        callback("Invalid Data");
                    }
                }
                else {
                    callback(status, message);
                }
            });
        });
    };



    /**
     * Get a Zzish content object
     * @param profileId - The id of the profile to which to get the content for
     * @param type - The content type
     * @param uuids - An array of uuids
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getContents = function (profileId, type, uuids, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/list/" + encodeURIComponent(uuids.join(";"))
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    if (data.payload!==undefined && data.payload!=null) {
                        callback(err, formatListContents(data,true));
                    }
                    else {
                        callback("Invalid Data");
                    }
                }
                else {
                    callback(status, message);
                }
            });
        });
    };


    function convertToParameters(obj) {
        var str = "";
        for (var key in obj) {
            if (str != "") {
                str += "&";
            }
            if (Array.isArray(obj[key])) {
                for (var i in obj[key]) {
                    str += key + "=" + encodeURIComponent(JSON.stringify(obj[key][i]));
                }
            }
            else {
                str += key + "=" + encodeURIComponent(JSON.stringify(obj[key]));
            }
        }
        return str;
    }

    /**
     * Search all content objects
     * @param type - The content type
     * @param meta - A list of parameters to search on meta part
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.searchPublicContent = function (type, meta, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/publicconsumers/" + type + "/search?" + convertToParameters(meta)
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListContents(data,false));
                }
                else {
                    callback(status, message);
                }
            });
        });
    };

    /**
     * Search a list of Zzish content object
     * @param profileId - The id of the profile to which to get the content for
     * @param type - The content type
     * @param meta - A list of parameters to search on meta part
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.searchContent = function (profileId, type, meta, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/search?" + convertToParameters(meta)
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListContents(data,false));
                }
                else {
                    callback(status, message);
                }
            });
        });
    };

    /**
     * Get a list of Zzish content object
     * @param profileId - The id of the profile to which to get contents for
     * @param type - The content type
     * @param callback - A callback to call when done (returns error AND (message or list of zzish,name))
     */
    Zzish.listContent = function (profileId, type, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListContents(data,false));
                }
                else {
                    callback(status, message);
                }
            });
        });
    };


    /**
     * Publish a content to a group
     * @param profileId - The id of the profile to which to get contents for
     * @param type - The content type
     * @param uuid - The id of the content
     * @param options-email - The email of the person so we can send them a link to register their account so they can access the group
     * @param options-code - The Zzish code of an existing class (optional)
     * @param options-access - the number of times a user can access the publish
     * @param options-groupName - the name of the group
     * @param options-public - whether to make the content public
     * @param callback - A callback to call when done (returns error AND (message or list of zzish,name))
     */
    Zzish.publishContent = function (profileId, type, uuid, options, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + uuid + "/publish",
            data: options
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * UnPublish a content
     * @param profileId - The id of the profile to which to get contents for
     * @param type - The content type
     * @param uuid - The email of the person so we can send them a link to register their account so they can access the group
     * @param groupCode - The Zzish code of an existing class
     * @param callback - A callback to call when done (returns error AND (message or list of zzish,name))
     */
    Zzish.unpublishContent  = function (profileId, type, uuid, groupCode, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + uuid + "/" + groupCode + "/unpublish",
            data: {}
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Return a list of contents and categories for a particular class code
     *
     * @param profileId - The Profile Id
     * @param code - The Zzish group Code
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.listContentForGroup = function(profileId, code, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/consumers/"+code,
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListCategoryContents(data));
                }
                else {
                    callback(status, message);
                }
            });
        })
    };

    /**
     * Register user with class, Return a list of contents and categories
     *
     * @param profileId - The Profile Id
     * @param code - The Zzish group Code
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.registerUserWithGroup = function(profileId, code, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + profileId + "/consumers/" + code + "/register",
            data: {}
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListCategoryContents(data));
                }
                else {
                    callback(status, message);
                }
            });
        })
    };

    /**
     * Get results for Zzish content object
     * @param uuid - THe uuid to get
     * @param parameters - Optional parameters to modify result
     *		limit: The nubmer of activity records (max 10) to return per request (default: 10)
            skip: Used for pagination (default: 0)
            iprofile: Include profile information (default: 0)
            idetails: Include individual actions for each activity instance (default: false)
            aggregate: Aggregate Results per activity definition (default: false)
            data: Return individual activity instance records. Works with limit and skip variables (default: false)
     * @param callback - A callback to call when done (returns error AND (message or data))
     *        Result object
                    data - An array of activity instance records (if data = true)
                    aggregate - An array of stats per activity (if aggregate = true)
                    meta - The meta descriptions for the data and aggregate fields
                        - data_total - The total number of activity instance records
                        - agg_total - The total number of aggregate records
                    query - A Summary of query parameters passed in (as the request)

     */
    Zzish.getUserResults = function (profileId, parameters, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "statements/" + profileId + "/results?" + convertToParameters(parameters)
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Get results for Zzish content object
     * @param profileId - The id of the profile to which to get the content for
     * @param type - The content type
     * @param uuid - THe uuid to get
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getContentResults = function (profileId, type, uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/contents/" + type + "/" + uuid+"/results"
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Get results for Zzish public content object
     * @param type - The content type
     * @param uuid - THe uuid to get
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getPublicContentResults = function (type, uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/publicconsumers/" + type + "/" + uuid+"/results"
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Get a Zzish public content object (as a consumer)
     * @param type - The content type
     * @param uuid - The Zzish content (JSON)
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getPublicContent = function (type,uuid, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/publicconsumers/" + type + "/" + uuid
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    if (data) {
                        callback(err,formatContentObject(data.payload,true));
                    }
                    else {
                        callback(status, message);
                    }
                }
                else {
                    callback(status, message);
                }
            });
        });
    };

    /**
     * Get a Zzish content object (as a consumer) by code
     * @param type - The content type
     * @param code - The Zzish content code
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getPublicContentByCode = function (type,code, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/publicconsumers/" + type + "/code/" + code
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err,formatContentObject(data.payload,true));
                }
                else {
                    callback(status, message);
                }
            });
        });
    };

    /**
     * Get a list of Zzish content object
     * @param type - The content type
     * @param callback - A callback to call when done (returns error AND (message or list of zzish,name))
     */
    Zzish.listPublicContent = function (type,callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/publicconsumers/" + type
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (!err) {
                    callback(err, formatListCategoryContents(data));
                }
                else {
                    callback(status, message);
                }
            });
        });
    };

    /**
     * Save a Zzish category object
     * @param profileId - The id of the profile to which to save the category for
     * @param category - The category object
     * @param callback - An optional callback to call when done (returns error,message)
     */
    Zzish.postCategory = function (profileId, category, callback) {
        var request = {
            method: "POST",
            url: getBaseUrl() + "profiles/" + profileId + "/categories/",
            data: category
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Delete a Zzish category object
     * @param profileId - The id of the profile to which to save the category for
     * @param id - The id of the category
     * @param callback - An optional callback to call when done (returns error,message)
     */
    Zzish.deleteCategory = function (profileId, id, callback) {
        var request = {
            method: "DELETE",
            url: getBaseUrl() + "profiles/" + profileId + "/categories/" + id
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

    /**
     * Get a list of Zzish category object
     * @param profileId - The id of the profile to which to get categorys for
     * @param callback - A callback to call when done (returns error AND (message or list of zzish,name))
     */
    Zzish.listCategories = function (profileId, callback) {
        var request = {
            method: "GET",
            url: getBaseUrl() + "profiles/" + profileId + "/categories"
        };
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    };

/**** USER STUFF ***/


    function loadLoginWithToken(type,params,callback) {
        var url = webUrl + 'account/applogin?token='+params.token;
        if (type=="pop") {
            var win = window.open(url, 'Zzish Login', 'width=800, height=600');
            var pollTimer = window.setInterval(
                function() {
                  try {
                    if (win.document.URL.indexOf(webUrl) === -1) {
                      window.clearInterval(pollTimer);
                      win.close();
                      Zzish.getCurrentUser(token,callback);
                    }
                  } catch(e) {
                  }
                }, 500);
        }
        else {
            window.location.href = url;
        }
    }

    /**
     * Login to Zzish
     * @param type - "pop" (default) will do a popup. "redirect" will go to zzish and then come back
     * @param options - a list of optinos for login
          redirectURL -  A URL hosted on the domain you are calling so that it can monitor success (will redirect to this page after succesful login and then close the page)
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.login = function (type,options,callback) {
        var token_request = {
            method: "POST",
            url: getBaseUrl() + "profiles/tokens",
            data: { options: options }
        };
        //create a token first
        sendData(token_request, function (err, data) {
                callCallBack(err, data, function(err,token) {
                options['token']=token;
                setDataValue("token", token);
                loadLoginWithToken(type,options,callback);
            });
        });
    };

    Zzish.getCurrentUser = function(token,callback) {
        if (token==undefined) {
            //see if we can get token from query params
            token = getQueryParams()["token"];
        }
        if (token==undefined) {
            token = getDataValue("token");
        }
        if (token !== undefined && token!="Zzish error" && token!="undefined") {
            var token_request = {
                method: "GET",
                url: getBaseUrl() + "profiles/tokens/" + token
            }
            //create a token first
            sendData(token_request, function (err, data) {
                callCallBack(err, data, function(err,data) {
                    data.token = token;
                    callback(err,data);
                });
            });
        }
        else {
            callback();
        }
    }

    /**
     * Logout from Zzish
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.logout = function (token,callback) {
        var request = {
            method: "DELETE",
            url: getBaseUrl() + "profiles/tokens/" + token
        }
        removeDataValue("token");
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    }

    /**** PROXY STUFF TO SEND DATA ***/
    /*** REQUEST has 3 attributes (method, url and data) ****/

    if (typeof window === 'undefined') {
        // we running in node so use https://www.npmjs.org/package/xmlhttprequest
        XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;
    }


    var req;
    var ocallback;


    function sendData(request, callback) {
        if (typeof request.method === 'undefined') {
            request.method = "POST";
        }
        if (logEnabled) console.log('Proxy.request ',request);
        req = new XMLHttpRequest();
        if(req.addEventListener){
            req.addEventListener('load', function () {
            response(this, callback, logEnabled);
            }, false);

            req.addEventListener('error', function () {
                error(this, callback, logEnabled);
            }, false);
        }else{
            ocallback = callback;
            req.onload = outputResult;
        }


        req.open(request.method, request.url, true);
        req.setRequestHeader(header, headerprefix+appId);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(request.data));
    }

    function outputResult() {
        if (logEnabled) console.log('Proxy.response callback', req.responseText !== undefined, ocallback);
        if (typeof ocallback === 'function') {
            var responseText = typeof req.responseText === 'string' ? JSON.parse(req.responseText) : req.responseText;
            ocallback(null, responseText);
        }
    }

    function response(resp, callback, log) {
        var err = null, res = null;
        try {
            if (resp.status >= 200 && resp.status < 300) {
                res = JSON.parse(resp.responseText);
            } else {
                err = JSON.parse(resp.responseText);
            }
        } catch (e) {
            err = resp.responseText;
        }
        if (log) console.log('Proxy.response callback', err, res);
        if (typeof callback === 'function') {
            callback(err, res);
        }
    }

    function error(evt, callback, log) {
        if (log) console.log('Proxy.error', JSON.stringify(evt));
        callback(evt.currentTarget, null);
    }

    /*** UUID STUFF from zzish.js ***/


    var _global = this;

    // Unique ID creation requires a high quality random # generator.  We feature
    // detect to determine the best RNG source, normalizing to a function that
    // returns 128-bits of randomness, since that's what's usually required
    var _rng;

    // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
    //
    // Moderately fast, high quality
    if (typeof(_global.require) == 'function') {
        try {
            var _rb = _global.require('crypto').randomBytes;
            _rng = _rb && function () {
                return _rb(16);
            };
        } catch (e) {
        }
    }

    if (!_rng && _global.crypto && crypto.getRandomValues) {
        // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
        //
        // Moderately fast, high quality
        var _rnds8 = new Uint8Array(16);
        _rng = function whatwgRNG() {
            crypto.getRandomValues(_rnds8);
            return _rnds8;
        };
    }

    if (!_rng) {
        // Math.random()-based (RNG)
        //
        // If all else fails, use Math.random().  It's fast, but is of unspecified
        // quality.
        var _rnds = new Array(16);
        _rng = function () {
            for (var i = 0, r; i < 16; i++) {
                if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
                _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
            }

            return _rnds;
        };
    }

    // Buffer class to use
    var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

    // Maps for number <-> hex string conversion
    var _byteToHex = [];
    var _hexToByte = {};
    for (var i = 0; i < 256; i++) {
        _byteToHex[i] = (i + 0x100).toString(16).substr(1);
        _hexToByte[_byteToHex[i]] = i;
    }

    // **`parse()` - Parse a UUID into it's component bytes**
    function parse(s, buf, offset) {
        var i = (buf && offset) || 0, ii = 0;

        buf = buf || [];
        s.toLowerCase().replace(/[0-9a-f]{2}/g, function (oct) {
            if (ii < 16) { // Don't overflow!
                buf[i + ii++] = _hexToByte[oct];
            }
        });

        // Zero out remaining bytes if string was short
        while (ii < 16) {
            buf[i + ii++] = 0;
        }

        return buf;
    }

    // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
    function unparse(buf, offset) {
        var i = offset || 0, bth = _byteToHex;
        return bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
    }

    // **`v1()` - Generate time-based UUID**
    //
    // Inspired by https://github.com/LiosK/UUID.js
    // and http://docs.python.org/library/zzish.html

    // random #'s we need to init node and clockseq
    var _seedBytes = _rng();

    // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
    var _nodeId = [
        _seedBytes[0] | 0x01,
        _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
    ];

    // Per 4.2.2, randomize (14 bit) clockseq
    var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

    // Previous zzish creation time
    var _lastMSecs = 0, _lastNSecs = 0;

    // See https://github.com/broofa/node-zzish for API details
    function v1(options, buf, offset) {
        var i = buf && offset || 0;
        var b = buf || [];

        options = options || {};

        var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

        // UUID timestamps are 100 nano-second units since the Gregorian epoch,
        // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
        // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
        // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
        var msecs = options.msecs != null ? options.msecs : new Date().getTime();

        // Per 4.2.1.2, use count of zzish's generated during the current clock
        // cycle to simulate higher resolution clock
        var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

        // Time since last zzish creation (in msecs)
        var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs) / 10000;

        // Per 4.2.1.2, Bump clockseq on clock regression
        if (dt < 0 && options.clockseq == null) {
            clockseq = clockseq + 1 & 0x3fff;
        }

        // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
        // time interval
        if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
            nsecs = 0;
        }

        // Per 4.2.1.2 Throw error if too many uuids are requested
        if (nsecs >= 10000) {
            throw new Error('zzish.v1(): Can\'t create more than 10M uuids/sec');
        }

        _lastMSecs = msecs;
        _lastNSecs = nsecs;
        _clockseq = clockseq;

        // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
        msecs += 12219292800000;

        // `time_low`
        var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
        b[i++] = tl >>> 24 & 0xff;
        b[i++] = tl >>> 16 & 0xff;
        b[i++] = tl >>> 8 & 0xff;
        b[i++] = tl & 0xff;

        // `time_mid`
        var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
        b[i++] = tmh >>> 8 & 0xff;
        b[i++] = tmh & 0xff;

        // `time_high_and_version`
        b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
        b[i++] = tmh >>> 16 & 0xff;

        // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
        b[i++] = clockseq >>> 8 | 0x80;

        // `clock_seq_low`
        b[i++] = clockseq & 0xff;

        // `node`
        var node = options.node || _nodeId;
        for (var n = 0; n < 6; n++) {
            b[i + n] = node[n];
        }

        return buf ? buf : unparse(b);
    }

    // **`v4()` - Generate random UUID**

    // See https://github.com/broofa/node-zzish for API details
    function v4(options, buf, offset) {
        // Deprecated - 'format' argument, as supported in v1.2
        var i = buf && offset || 0;

        if (typeof(options) == 'string') {
            buf = options == 'binary' ? new BufferClass(16) : null;
            options = null;
        }
        options = options || {};

        var rnds = options.random || (options.rng || _rng)();

        // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
        rnds[6] = (rnds[6] & 0x0f) | 0x40;
        rnds[8] = (rnds[8] & 0x3f) | 0x80;

        // Copy bytes to buffer, if provided
        if (buf) {
            for (var ii = 0; ii < 16; ii++) {
                buf[i + ii] = rnds[ii];
            }
        }

        return buf || unparse(rnds);
    }

    // Export public API


    var zzish = Zzish;

    if (typeof define === 'function' && define.amd) {
        // Publish as AMD module
        define(function () {
            return zzish;
        });
    } else if (typeof(module) != 'undefined' && module.exports) {
        // Publish as node.js module
        module.exports = zzish;
    } else {
        // Publish as global (in browsers)
        var _previousRoot = _global.uuid;

        // **`noConflict()` - (browser only) to reset global 'zzish' var**
        zzish.noConflict = function () {
            _global.zzish = _previousRoot;
            return zzish;
        };

        _global.zzish = zzish;
    }

})();
