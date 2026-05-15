log.write("THEWAY", log.INFO, "Initializing V2.4.2")
local tcpServer                        = nil
local udpSpeaker                       = nil
package.path                           = package.path .. ";" .. lfs.currentdir() .. "/LuaSocket/?.lua"
package.cpath                          = package.cpath .. ";" .. lfs.currentdir() .. "/LuaSocket/?.dll"
package.path = package.path .. ";.\\Scripts\\?.lua;.\\Scripts\\UI\\?.lua;.\\dxgui\\loader\\?.lua;.\\dxgui\\bind\\?.lua;.\\dxgui\\skins\\common\\?.lua;.\\dxgui\\skins\\skinME\\?.lua"
local socket                           = require("socket")
local JSON                             = loadfile("Scripts\\JSON.lua")()
local DialogLoader = require("DialogLoader")
local dxgui = require('dxgui')
local Skin = require("Skin")
local SkinUtils = require("SkinUtils")

local upstreamLuaExportStart           = LuaExportStart
local upstreamLuaExportAfterNextFrame  = LuaExportAfterNextFrame
local upstreamLuaExportBeforeNextFrame = LuaExportBeforeNextFrame

local crosshair = nil 

function LuaExportStart()
    if upstreamLuaExportStart ~= nil then
        successful, err = pcall(upstreamLuaExportStart)
        if not successful then
            log.write("THEWAY", log.ERROR, "Error in upstream LuaExportStart function" .. tostring(err))
        end
    end

    udpSpeaker = socket.udp()
    udpSpeaker:settimeout(0)
    tcpServer = socket.tcp()
    tcpServer:bind("127.0.0.1", 42070)
    tcpServer:listen(1)
    tcpServer:settimeout(0)

    crosshair = DialogLoader.spawnDialogFromFile(
        lfs.writedir() .. "Scripts\\TheWay\\Crosshair.dlg"
    )
    local skin = crosshair.WaypointCrosshair:getSkin()
    local crosshairPicturePath = lfs.writedir()..skin.skinData.states.released[1].picture.file
    crosshair.WaypointCrosshair:setSkin(SkinUtils.setStaticPicture(crosshairPicturePath, skin))
    local screenWidth, screenHeigt = dxgui.GetScreenSize()
    local x = screenWidth/2 - 5
    local y = screenHeigt/2 - 5
    crosshair:setBounds(math.floor(x), math.floor(y), 10, 10)
end

function LuaExportStop()
    crosshair:setVisible(false)
end

local data
local frameCount = 0
local busy = false;
local isPressed = false
local currCommandIndex = 1
local lastDevice = ""
local lastCode = ""
local lastNeedDepress = true
local whenToDepress = nil
local crosshairVisible = false
local stringtoboolean={ ["true"]=true, ["false"]=false }
function LuaExportBeforeNextFrame()
    if upstreamLuaExportBeforeNextFrame ~= nil then
        successful, err = pcall(upstreamLuaExportBeforeNextFrame)
        if not successful then
            log.write("THEWAY", log.ERROR, "Error in upstream LuaExportBeforeNextFrame function" .. tostring(err))
        end
    end

    if busy then
        if isPressed then
            -- check if the time has come to depress
            local currTime = socket.gettime()
            if currTime >= whenToDepress then
                -- check if it even needs a depress
                if lastNeedDepress then
                    GetDevice(lastDevice):performClickableAction(lastCode, 0)
                end
                isPressed = false
                currCommandIndex = currCommandIndex + 1
            end
        else
            -- Prepare for new button push
            local decodedData = JSON:decode(data)
            local keys = decodedData["payload"]
            --check if there are buttons left to press
            if currCommandIndex <= #keys then
                lastDevice = keys[currCommandIndex]["device"]
                lastCode = keys[currCommandIndex]["code"]
                local stringtoboolean = { ["true"] = true,["false"] = false }
                lastNeedDepress = stringtoboolean[keys[currCommandIndex]["addDepress"]]
                local delay = tonumber(keys[currCommandIndex]["delay"])
                local activate = tonumber(keys[currCommandIndex]["activate"])
                -- Push the button
                GetDevice(lastDevice):performClickableAction(lastCode, activate)
                --Store the time when we will need to depress
                whenToDepress = socket.gettime() + (delay / 1000)
                isPressed = true
            else
                --if there's nothing else to press, we are done
                busy = false
                currCommandIndex = 1
            end
        end
    else
        local client, err = tcpServer:accept()
        if client ~= nil then
            client:settimeout(10)
            data, err = client:receive()
            if err then
                log.write("THEWAY", log.ERROR, "Error at receiving: " .. err)
            end

            if data then
                local keys = JSON:decode(data)
                if keys["type"] == "waypoints" then
                    busy = true
                elseif keys["type"] == "crosshair" then
                    local shouldBeVisible = stringtoboolean[keys["payload"]]
                    crosshair:setVisible(shouldBeVisible)
                end
            end
        end
    end
end

function LuaExportAfterNextFrame()
    if upstreamLuaExportAfterNextFrame ~= nil then
        successful, err = pcall(upstreamLuaExportAfterNextFrame)
        if not successful then
            log.write("THEWAY", log.ERROR, "Error in upstream LuaExportAfterNextFrame function" .. tostring(err))
        end
    end


    local camPos = LoGetCameraPosition()
    local loX = camPos['p']['x']
    local loZ = camPos['p']['z']
    local elevation = LoGetAltitude(loX, loZ)
    local coords = LoLoCoordinatesToGeoCoordinates(loX, loZ)
    local selfData = LoGetSelfData()
    local model = selfData and selfData['Name'] or 'Spectator'
    local message = {}
    message["model"] = model
    message["coords"] = {}
    message["coords"]["lat"] = tostring(coords.latitude)
    message["coords"]["long"] = tostring(coords.longitude)
    message["elev"] = tostring(elevation)

    frameCount = frameCount + 1
    if frameCount == 200 then
        if selfData then
            local keys = ""
            for k, v in pairs(selfData) do keys = keys .. tostring(k) .. "(" .. type(v) .. ") " end
            log.write("THEWAY", log.INFO, "selfData keys: " .. keys)
            log.write("THEWAY", log.INFO, "selfData.Heading=" .. tostring(selfData['Heading']))
            if selfData['LatLongAlt'] then
                local lla = selfData['LatLongAlt']
                log.write("THEWAY", log.INFO, "LatLongAlt.Lat=" .. tostring(lla['Lat']) .. " Long=" .. tostring(lla['Long']) .. " Alt=" .. tostring(lla['Alt']))
            else
                log.write("THEWAY", log.WARNING, "LatLongAlt is nil")
            end
            if selfData['Position'] then
                local p = selfData['Position']
                log.write("THEWAY", log.INFO, "Position.x=" .. tostring(p['x']) .. " y=" .. tostring(p['y']) .. " z=" .. tostring(p['z']))
            else
                log.write("THEWAY", log.WARNING, "Position is nil")
            end
        else
            log.write("THEWAY", log.WARNING, "selfData is nil at frame 200")
        end
        local magOk2, magYaw2 = pcall(LoGetMagneticYaw)
        log.write("THEWAY", log.INFO, "LoGetMagneticYaw ok=" .. tostring(magOk2) .. " val=" .. tostring(magYaw2))
        local iasOk2, ias2 = pcall(LoGetIndicatedAirSpeed)
        log.write("THEWAY", log.INFO, "LoGetIndicatedAirSpeed ok=" .. tostring(iasOk2) .. " val=" .. tostring(ias2))
    end

    if selfData then
        if selfData['Heading'] then
            local trueHdg = math.deg(selfData['Heading'])
            if trueHdg < 0 then trueHdg = trueHdg + 360 end
            message["trueHdg"] = trueHdg
        end
        if selfData['LatLongAlt'] then
            local lla = selfData['LatLongAlt']
            if lla['Alt'] then message["baroAlt"] = lla['Alt'] end
            if lla['Lat'] and lla['Long'] then
                message["aircraftLat"] = lla['Lat']
                message["aircraftLong"] = lla['Long']
            end
        end
        -- fallback: convert world position coords to geo if LatLongAlt unavailable
        if not message["aircraftLat"] then
            local pos = selfData['Position']
            if pos and pos['x'] and pos['z'] then
                local ok, selfCoords = pcall(LoLoCoordinatesToGeoCoordinates, pos['x'], pos['z'])
                if ok and selfCoords then
                    message["aircraftLat"] = selfCoords.latitude
                    message["aircraftLong"] = selfCoords.longitude
                end
            end
        end
    end

    local magOk, magYaw = pcall(LoGetMagneticYaw)
    if magOk and magYaw then
        local magHdg = math.deg(magYaw)
        if magHdg < 0 then magHdg = magHdg + 360 end
        message["magHdg"] = magHdg
    end

    local iasOk, ias = pcall(LoGetIndicatedAirSpeed)
    if iasOk and ias then message["ias"] = ias end

    local tasOk, tas = pcall(LoGetTrueAirSpeed)
    if tasOk and tas then message["tas"] = tas end

    local toSend = JSON:encode(message)

    if pcall(function()
            socket.try(udpSpeaker:sendto(toSend, "127.0.0.1", 42069))
        end) then
    else
        log.write("THEWAY", log.ERROR, "Unable to send data")
    end
end

log.write("THEWAY", log.INFO, "Done")
