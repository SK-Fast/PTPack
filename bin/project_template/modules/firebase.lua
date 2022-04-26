local modules = {}

--[[
    log function

    Summary
        For logging errors and debug
    
    Params
        text {string} Text to log
        type {string} Type of log text
        responseData {string} HTTP Response data
]]
local function log(text, type, responseData)
    local resultStr = "<b><color=#f5b642>FIREBASE</color></b> "
    if type == "err" then
        resultStr = resultStr.."<b><color=#f54242>ERR</color></b> "
    end

    resultStr = resultStr..text.."\n"..responseData

    print(resultStr)
end

--[[
    loadFields function

    Summary
        For passing Firebase field response to human readable table
    
    Params
        fields {table} Firebase field response

    Return
        {table} Field table
]]

local function isJSONString(str)
    local result = pcall(function()
        json.parse(str)
    end)

    return result
end

--[[
    GetRealtimeDb Function

    Summary
        For accessing Firebase Realtime Database

    Params
        projectID {string} Firebase Project ID
]]
function modules.GetRealtimeDb(projectID,authSecret)
    local databaseProjectID = ""
    local databaseAuthSecret = ""

    if projectID == nil or projectID == "" then
        log("ProjectID cannot be nil or empty string.", "err", "In <b>InitializeApp</b> function.")
    end

    if authSecret then
        databaseAuthSecret = "?auth="..authSecret
    end

    databaseProjectID = projectID

    local realtimeDb = {}

    --[[
    ReadData Function

    Summary
        For reading data in database
    
    Params
        path {string} document path
    
    Return
        {table} Table of field data
    ]]
    function realtimeDb.ReadData(path)
        local requestFinished = false
        local requestData = ""
        local requestError = ""
        Http:Get("https://"..databaseProjectID.."-default-rtdb.firebaseio.com/"..path..".json"..databaseAuthSecret, function (data, error, errmsg)
            requestData = data
            requestError = errmsg
            requestFinished = true
        end)

        while requestFinished == false do
            wait(0)
        end

        if requestError ~= nil then
            log(requestError,"err",requestData)
            return
        end

        local parse

        if isJSONString(requestData) then
            parse = json.parse(requestData)
        else
            parse = requestData
            if string.sub(parse, 1, 1) == '"' or string.sub(parse, 1, 1) == "'" then
                parse = parse:sub(2)
                parse = parse:sub(1, -2)
            end
        end

        return parse
    end

    --[[
    SetData Function

    Summary
        For reading data in database
    
    Params
        path {string} document path
        putData {table} Data to set
    
    Return
        {table} Table of field data
    ]]
    function realtimeDb.SetData(path,putData)
        local requestFinished = false
        local requestData = ""
        local requestError = ""
        Http:Put("https://"..databaseProjectID.."-default-rtdb.firebaseio.com/"..path..".json"..databaseAuthSecret, json.serialize(putData), function (data, error, errmsg)
            requestData = data
            requestError = errmsg
            requestFinished = true
        end)

        while requestFinished == false do
            wait(0)
        end

        if requestError ~= nil then
            log(requestError,"err",requestData)
            return
        end


        local parse = json.parse(requestData)

        return parse
    end

    return realtimeDb
end

return modules