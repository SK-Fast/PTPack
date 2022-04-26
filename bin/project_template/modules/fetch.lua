local module = {}

function module.fetch(apiURL, option)
    local httpComplete = false
    local responseData = ""
    local responseError = ""
    local responseErrorMsg = ""
    local requestMethod = "Get"
    local requestBody = ""
    local requestParams = ""

    local function isJSONString(str)
        local result = pcall(function()
            json.parse(str)
        end)

        return result
    end

    if option then
        if option["method"] then
            requestMethod = option["method"]
        end
        if option["body"] then
            if isJSONString(option["body"]) then
                requestBody = json.serialize(option["body"])
            else
                requestBody = option["body"]
            end
        end
        if option["params"] then
            local isFirst = true
            for i,v in pairs(option["params"]) do
                if isFirst == true then
                    isFirst = false
                    requestParams = requestParams.."?"..i.."="..v
                else
                    requestParams = requestParams.."&"..i.."="..v
                end
            end
        end
    end

    apiURL = apiURL..requestParams

    if requestMethod == "Get" then
        Http:Get(apiURL, function (data, err, errmsg)
            responseData = data
            responseError = err
            responseErrorMsg = errmsg
            httpComplete = true
        end)
    end

    if requestMethod == "Post" then
        Http:Post(apiURL, requestBody, function (data, err, errmsg)
            responseData = data
            responseError = err
            responseErrorMsg = errmsg
            httpComplete = true
        end)
    end

    if requestMethod == "Put" then
        Http:Put(apiURL, requestBody, function (data, err, errmsg)
            responseData = data
            responseError = err
            responseErrorMsg = errmsg
            httpComplete = true
        end)
    end

    if requestMethod == "Delete" then
        Http:Delete(apiURL, requestBody, function (data, err, errmsg)
            responseData = data
            responseError = err
            responseErrorMsg = errmsg
            httpComplete = true
        end)
    end

    while httpComplete == false do
        wait(0)
    end
    
    if responseError then
        print("<color=red>"..(string.upper(requestMethod)).." <u>"..apiURL.."</u> <br>"..responseErrorMsg.."</color>")
    end

    local http = {}

    function http.text()
        return responseData
    end

    function http.json()
        return json.parse(responseData)
    end
    
    return http
end

return module