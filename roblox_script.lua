local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")

-- GANTI URL INI DENGAN LINK RAILWAY KAMU NANTI (contoh: https://web-kamu.up.railway.app/api/check)
local API_URL = "https://URL-RAILWAY-KAMU/api/check"

local KICK_MESSAGE = [[
CLAIM LISENSI DI 
TIKTOK : mellsroblox.id
WA :082174905591
KRACKED?HAMA 
]]

local function checkLicense()
	-- Jangan mematikan saat tes di Studio
	if game:GetService("RunService"):IsStudio() then
		warn("Berjalan di Studio, melewatkan cek lisensi.")
		return true
	end

	local placeId = game.PlaceId
	local requestData = { placeId = placeId }
	
	local success, result = pcall(function()
		return HttpService:RequestAsync({
			Url = API_URL,
			Method = "POST",
			Headers = { ["Content-Type"] = "application/json" },
			Body = HttpService:JSONEncode(requestData)
		})
	end)

	if success and result.Success then
		local decoded = HttpService:JSONDecode(result.Body)
		if decoded.isLicensed then
			print("MCHLERN LISENSI: VALID. SYSTEM STARTING...")
			return true
		end
	end
	
	return false
end

-- Eksekusi Pengecekan
if not checkLicense() then
	warn("MCHLERN LISENSI: INVALID PLACE ID.")
	
	-- Kick pemain yang baru masuk
	Players.PlayerAdded:Connect(function(player)
		player:Kick(KICK_MESSAGE)
	end)
	
	-- Kick pemain yang sudah ada
	for _, player in ipairs(Players:GetPlayers()) do
		player:Kick(KICK_MESSAGE)
	end
	
	-- Hancurkan script ini beserta sistemnya biar gabisa dicuri
	script.Parent:Destroy()
end
