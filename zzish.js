// Global Zzish object

(function () {
    Zzish = {};

/**** FRONT END JAVASCRIPT STUFF (WITH STATE) ***/

//STATE THAT NEEDS TO BE TRACK PER USER (ON THE CLIENT SIDE)

    //tracks this device
    var deviceId;
    //tracks a session (resets when a new user is selected)
    var sessionId
    //the app Id (sandbox or production) generated from developer consoler (https://developer.zzish.com)
    var appId;
    //keep track of the current user (so we know when session needs to be udpated)
    var currentUser = null;



/**** CONFIGURATION ******/

    var header = "X-ApplicationId";
    var headerprefix = "";
    //var baseUrl = "http://localhost:8080/zzishapi/api/";
    //var headerprefix = "Bearer ";
    var baseUrl = "http://api.zzish.co.uk/api/";
    //logEnabled
    var logEnabled = true;

    /**
     * Initialise Zzish instance
     */
    Zzish.init = function (applicationId) {
        //generate a device if we don't have one
        if (typeof localStorage != 'undefined') {
            deviceId = localStorage.getItem("deviceId");
            if (deviceId == null) {
                deviceId = v4();
                localStorage.setItem("deviceId", deviceId);
            }            
        }
        appId = applicationId;
    };

/**** CLIENT SIDE (REQUIRE STATE METHOD) *****/

    /**
     * Get the User (if the id is the same as the current one, returns the current user)
     *
     * @param id - A unique Id for the user (required)
     * @param name - The name of the user (optional)
     * @param callback - An optional callback after user has been saved on server
     * @return The user Id (returns the same id provided or a generated one)
     */
    Zzish.getUser = function (id, name, callback) {
        if (currentUser==undefined || currentUser.id != id) {
            sessionId = v4();
            createUser(id,name,callback);
        }
        else {
            callCallBack(null, {status: 200, payload: currentUser}, callback);
        }
    };

    /**
     * Start Activity with name
     *
     * @param userId - The userId of the user (required)
     * @param name - The name of the activity (required)
     * @param code - The Zzish Class Code when creating a class in the learning hub (optional)
     * @param callback - A callback to be called after message is sent (returns error,message)
     * @return The activity uuid
     */
    Zzish.startActivity = function (userId, name, code, callback) {
        aid = v4();
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/start",
            activityName: name,
            activityUuid: aid,
            classCode: code
        }, callback)
        return aid;
    };

    /**
     * stop Activity with aid
     *
     * @param aid - The activity id (returned from startActivity) (required)
     * @param states - A string represented JSON of attributes to save for this activity (optional)
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.stopActivity = function (aid, states, callback) {
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/complete",
            attributes: states,
            activityUuid: aid
        }, callback)
    };

    /**
     * Cancel Activity with aid
     *
     * @param aid - The activity id (returned from startActivity) (required)
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.cancelActivity = function (aid, callback) {
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/cancel",
            activityUuid: aid
        }, callback)
    };

    /**
     * Log an Action
     *
     * @param aid - The activity id (returned from startActivity) (required)
     * @param name - The name of the action (required)
     * @param response - A string representation of the action (optional)
     * @param score - A float score (optional)
     * @param duration - A long duration (optional)
     * @param attempts - The number of attempts taken (optional)
     * @param attributes - A string represented JSON of attributes to save for this action (optional)
     * @param callback - A callback to be called after message is sent (returns error,message)
     *
     */
    Zzish.logAction = function (aid, name, response, score, correct, duration, attempts, attributes, callback) {
        var action = {
            definition: {
                type: name
            }
        }
        if (response != undefined) {
            action["response"] = response;
        }
        if (score != undefined) {
            action["score"] = parseFloat(score);
        }
        if (correct != undefined) {
            action["correct"] = parseInt(correct);
        }
        if (duration != undefined) {
            action["duration"] = parseInt(duration);
        }
        if (attempts != undefined) {
            action["attempts"] = parseInt(attempts);
        }
        if (attributes != undefined && attributes != "") {
            action.state = {};
            action.state["attributes"] = JSON.parse(attributes);
        }
        sendMessage({
            verb: "http://activitystrea.ms/schema/1.0/start",
            activityUuid: aid,
            actions: [action]
        }, callback);
    };

    /**
     * send message to REST API
     *
     * @param data - A partial tincan statement
     * @param callback - An optional callback to call when done (returns error,message)
     *
     */
    var sendMessage = function (data, callback) {
        data.userUuid = userId;
        data.deviceId = deviceId;
        data.sessionId = sessionId;
        if (data.attributes == undefined) {
            data.attributes = {}
        }
        var message = buildSimulationMessage(data);
        var headers = {
            'Content-Type': 'application/json'
        }
        headers[header] = headerprefix + appId;    
        
        if (logEnabled) console.log("Sending" + JSON.stringify(message));
        var request = {
            method: "POST",
            url: baseUrl + "statements",
            data: message
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };

    /**
     * Build an (extended) TinCan statement
     * @param data
     * @returns partially built TinCan message
     */
    var buildSimulationMessage = function (data) {

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
                definition: {
                    type: data.activityName
                }
            },
            id: data.activityUuid,
            context: {
                extensions: {
                    "http://www.zzish.com/context/extension/groupCode": data.classCode,
                    "http://www.zzish.com/context/extension/deviceId": data.deviceId,
                    "http://www.zzish.com/context/extension/sessionId": data.sessionId
                }
            }
        };
        if (!!data.attributes) {
            var found = false;
            for (i in data.attributes) {
                found = true;
            }
            if (found) {
                message.object.state = {
                    attributes: data.attributes
                }
            }
        }
        if (!!data.actions) {
            if (data.actions[0].attributes && data.actions[0].attributes.length != undefined) {
                data.actions[0].state.attributes = data.actions[0].attributes;
            }
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
                    callback(data.status, data.payload);
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

/**** BACK END USER STUFF ***/

    /**
     * Create a user
     *
     * @param id - A unique Id for the user (required)
     * @param name - The name of the user (optional)
     * @param callback - An optional callback after user has been saved on server
     * @return The user Id (returns the same id provided or a generated one)
     */
    Zzish.createUser = function (id, name, callback) {
        var message = {
            uuid: id,
            name: name
        }
        var request = {
            method: "POST",
            url: baseUrl + "profiles",
            data: message
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        })
    };


/**** CONTENT STUFF TO SEND DATA ***/

    /**
     * Save a Zzish content object
     * @param id - The id of the profile to which to save the content for
     * @param name - The id of the profile to which to save the content for
     * @param content - The JSON object to save
     * @param callback - An optional callback to call when done (returns error,message)
     */
    Zzish.postContent = function (profileId, id, name, content, callback) {
        var data = {
            uuid: id,
            name: name,
            payload: JSON.stringify(content)
        }
        var request = {
            method: "POST",
            url: baseUrl + "profiles/" + profileId + "/contents",
            data: data
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    }

    /**
     * Get a Zzish content object
     * @param profileId - The id of the profile to which to get the content for
     * @param content - The Zzish content (JSON)
     * @param callback - A callback to call when done (returns error AND (message or data))
     */
    Zzish.getContent = function (profileId, uuid, callback) {
        var request = {
            method: "GET",
            url: baseUrl + "profiles/" + profileId + "/contents/" + uuid
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (status == 200) {
                    callback(200, data.payload.payload);
                }
                else {
                    callback(status, message);
                }
            });
        });
    }

    /**
     * Get a list of Zzish content object
     * @param profileId - The id of the profile to which to get contents for
     * @param callback - A callback to call when done (returns error AND (message or list of uuid,name))
     */
    Zzish.listContent = function (profileId, callback) {
        var request = {
            method: "GET",
            url: baseUrl + "profiles/" + profileId + "/contents"
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, function (status, message) {
                if (status == 200) {
                    var list = [];
                    for (i in data.payload) {
                        var result = {
                            uuid: data.payload[i].uuid,
                            name: data.payload[i].name,
                        }
                        list.push(result);
                    }
                    callback(200, list);
                }
                else {
                    callback(status, message);
                }
            });
        });
    }

    /**
     * Publish a content to a group    
     * @param profileId - The id of the profile to which to get contents for
     * @param email - The email of the person so we can send them a link to register their account so they can access the group
     * @param uuid - The uuid of the content
     * @param code - The Zzish code of an existing class (optional)
     * @param callback - A callback to call when done (returns error AND (message or list of uuid,name))
     */
    Zzish.publishContentToGroup = function (profileId, email, uuid, code, callback) {
        var data = {};
        if (code!=undefined && code!='') {
            data['code'] = code;
        }
        if (email!=undefined && email!='') {
            data['email'] = email;
        }
        var request = {
            method: "POST",
            url: baseUrl + "profiles/" + profileId + "/contents/" + uuid,
            data: data
        }
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    }

/**** USER STUFF ***/

    /**
     * Send Register Request
     * @param profileId - The User Id you have used to identify the User
     * @param email - The email address to send the register request
     */
    Zzish.sendRegister = function (profileId,email,callback) {
        var data = {
            email: email
        };
        var request = {
            method: "POST",
            url: baseUrl + "profiles/" + profileId+ "/sendregister",
            data: data
        }
        //create a token first
        sendData(request, function (err, data) {
            callCallBack(err, data, callback);
        });
    }

    /**
     * Register with zzish
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.register = function (callback) {
        var token_request = {
            method: "POST",
            url: baseUrl + "profiles/register"
        }
        //create a token first
        // sendData(token_request, function (err, data) {
        //     callCallBack(err, data, callback);
        // });
        callback(200,{uuid: 12345});
    }

    /**
     * Login to Zzish
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.login = function (callback) {
        var token_request = {
            method: "POST",
            url: baseUrl + "profiles/tokens"
        }
        //create a token first
        // sendData(token_request, function (err, data) {
        //     callCallBack(err, data, callback);
        // });
        callback(200,{uuid: 12345});
    }

    /**
     * Logout from Zzish
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.logout = function (profileId,callback) {
        var request = {
            method: "POST",
            url: baseUrl + "profiles/" + profileId + "/logout"
        }
        // sendData(request, function (err, data) {
        //     callCallBack(err, data, callback);
        // });
        callback(200);
    }

    /**
     * Logout from Zzish
     * @param callback - A callback to call when done (returns error AND (message or user))
     */
    Zzish.listGroups = function (profileId, callback) {
        var request = {
            method: "GET",
            url: baseUrl + "profiles/" + profileId + "/groups"
        }
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

    function sendData(request, callback) {
        if (typeof request.method === 'undefined') {
            request.method = "POST";
        }
        req = new XMLHttpRequest();
        req.addEventListener('load', function () {
            response(this, callback, logEnabled);
        }, false);
        req.addEventListener('error', function () {
            error(this, callback, logEnabled);
        }, false);
        req.open(request.method, request.url, logEnabled);
        req.setRequestHeader(header, appId);
        req.setRequestHeader('Content-Type', 'application/json');
        req.send(JSON.stringify(request.data));
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

    /*** UUID STUFF from uuid.js ***/


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
    // and http://docs.python.org/library/uuid.html

    // random #'s we need to init node and clockseq
    var _seedBytes = _rng();

    // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
    var _nodeId = [
        _seedBytes[0] | 0x01,
        _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
    ];

    // Per 4.2.2, randomize (14 bit) clockseq
    var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

    // Previous uuid creation time
    var _lastMSecs = 0, _lastNSecs = 0;

    // See https://github.com/broofa/node-uuid for API details
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

        // Per 4.2.1.2, use count of uuid's generated during the current clock
        // cycle to simulate higher resolution clock
        var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

        // Time since last uuid creation (in msecs)
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
            throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
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

    // See https://github.com/broofa/node-uuid for API details
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


    var uuid = Zzish;

    if (typeof define === 'function' && define.amd) {
        // Publish as AMD module
        define(function () {
            return uuid;
        });
    } else if (typeof(module) != 'undefined' && module.exports) {
        // Publish as node.js module
        module.exports = uuid;
    } else {
        // Publish as global (in browsers)
        var _previousRoot = _global.uuid;

        // **`noConflict()` - (browser only) to reset global 'uuid' var**
        uuid.noConflict = function () {
            _global.zzish = _previousRoot;
            return uuid;
        };

        _global.zzish = uuid;
    }

})();