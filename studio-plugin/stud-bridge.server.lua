--[[
	stud-bridge - Roblox Studio Plugin for Stud
	
	This plugin connects Roblox Studio to the Stud desktop app,
	allowing AI-powered editing and manipulation of your game.
	
	Installation:
	1. Copy this file to your Roblox Plugins folder
	   - Windows: %LOCALAPPDATA%\Roblox\Plugins
	   - Mac: ~/Documents/Roblox/Plugins
	2. Restart Roblox Studio
	3. Enable HTTP requests in Game Settings > Security
	4. Click the stud-bridge button to connect
]]

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")
local ScriptEditorService = game:GetService("ScriptEditorService")
local ChangeHistoryService = game:GetService("ChangeHistoryService")
local TweenService = game:GetService("TweenService")

local PLUGIN_NAME = "stud-bridge"
local PLUGIN_DISPLAY_NAME = "Stud"
local POLL_URL = "http://localhost:3001/stud/poll"
local RESPOND_URL = "http://localhost:3001/stud/respond"
local MAX_ACTIVITY_LOG = 10

-- State
local isConnected = false
local isConnecting = false
local pollingEnabled = false
local isProcessing = false
local projectInfo = nil
local activityLog = {}

-- UI Elements
local toolbar = plugin:CreateToolbar(PLUGIN_DISPLAY_NAME)
local toggleButton = toolbar:CreateButton(
	PLUGIN_DISPLAY_NAME,
	"Connect to Stud AI",
	"rbxassetid://4458901886" -- Generic connect icon
)

-- Colors (cozy light theme to match Stud app)
local Colors = {
	bg = Color3.fromRGB(250, 250, 250),
	bgSecondary = Color3.fromRGB(245, 245, 245),
	bgTertiary = Color3.fromRGB(240, 240, 240),
	accent = Color3.fromRGB(139, 124, 246), -- Soft purple from Stud
	accentHover = Color3.fromRGB(159, 144, 255),
	success = Color3.fromRGB(34, 197, 94),
	warning = Color3.fromRGB(250, 204, 21),
	error = Color3.fromRGB(239, 68, 68),
	text = Color3.fromRGB(28, 28, 28),
	textSecondary = Color3.fromRGB(100, 100, 100),
	textMuted = Color3.fromRGB(150, 150, 150),
	border = Color3.fromRGB(229, 229, 229),
	processing = Color3.fromRGB(59, 130, 246),
}

-- Widget UI
local widget
local statusDot
local statusText
local subText
local connectButton
local activityContainer
local activityList
local processingIndicator

-- Utility: Create rounded frame
local function createFrame(props)
	local frame = Instance.new("Frame")
	frame.BackgroundColor3 = props.bg or Colors.bg
	frame.BorderSizePixel = 0
	frame.Size = props.size or UDim2.new(1, 0, 0, 40)
	frame.Position = props.position or UDim2.new(0, 0, 0, 0)
	frame.BackgroundTransparency = props.transparency or 0
	
	if props.corner then
		local corner = Instance.new("UICorner")
		corner.CornerRadius = UDim.new(0, props.corner)
		corner.Parent = frame
	end
	
	if props.parent then
		frame.Parent = props.parent
	end
	
	return frame
end

-- Utility: Create text label
local function createLabel(props)
	local label = Instance.new("TextLabel")
	label.BackgroundTransparency = 1
	label.Size = props.size or UDim2.new(1, 0, 0, 20)
	label.Position = props.position or UDim2.new(0, 0, 0, 0)
	label.TextColor3 = props.color or Colors.text
	label.Text = props.text or ""
	label.TextSize = props.textSize or 14
	label.Font = props.font or Enum.Font.GothamMedium
	label.TextXAlignment = props.align or Enum.TextXAlignment.Left
	label.TextTruncate = Enum.TextTruncate.AtEnd
	
	if props.parent then
		label.Parent = props.parent
	end
	
	return label
end

-- Utility: Create button
local function createButton(props)
	local button = Instance.new("TextButton")
	button.BackgroundColor3 = props.bg or Colors.accent
	button.BorderSizePixel = 0
	button.Size = props.size or UDim2.new(1, 0, 0, 36)
	button.Position = props.position or UDim2.new(0, 0, 0, 0)
	button.TextColor3 = props.textColor or Color3.fromRGB(255, 255, 255)
	button.Text = props.text or "Button"
	button.TextSize = props.textSize or 14
	button.Font = props.font or Enum.Font.GothamBold
	button.AutoButtonColor = false
	
	local corner = Instance.new("UICorner")
	corner.CornerRadius = UDim.new(0, props.corner or 12)
	corner.Parent = button
	
	-- Hover effect
	button.MouseEnter:Connect(function()
		TweenService:Create(button, TweenInfo.new(0.15), {
			BackgroundColor3 = props.bgHover or Colors.accentHover
		}):Play()
	end)
	
	button.MouseLeave:Connect(function()
		TweenService:Create(button, TweenInfo.new(0.15), {
			BackgroundColor3 = props.bg or Colors.accent
		}):Play()
	end)
	
	if props.parent then
		button.Parent = props.parent
	end
	
	return button
end

-- Add activity to log
local function addActivity(action, status, details)
	local entry = {
		time = os.date("%H:%M:%S"),
		action = action,
		status = status,
		details = details or ""
	}
	
	table.insert(activityLog, 1, entry)
	
	-- Keep log trimmed
	while #activityLog > MAX_ACTIVITY_LOG do
		table.remove(activityLog)
	end
	
	-- Update UI
	if activityList then
		-- Clear existing
		for _, child in ipairs(activityList:GetChildren()) do
			if child:IsA("Frame") then
				child:Destroy()
			end
		end
		
		-- Add entries
		for i, entry in ipairs(activityLog) do
			local row = createFrame({
				bg = i % 2 == 0 and Colors.bgSecondary or Colors.bg,
				size = UDim2.new(1, 0, 0, 28),
				parent = activityList
			})
			
			-- Time
			createLabel({
				text = entry.time,
				color = Colors.textMuted,
				textSize = 11,
				font = Enum.Font.RobotoMono,
				size = UDim2.new(0, 55, 1, 0),
				position = UDim2.new(0, 8, 0, 0),
				parent = row
			})
			
			-- Status dot
			local dot = Instance.new("Frame")
			dot.Size = UDim2.new(0, 6, 0, 6)
			dot.Position = UDim2.new(0, 68, 0.5, -3)
			dot.BorderSizePixel = 0
			dot.BackgroundColor3 = entry.status == "success" and Colors.success or 
				entry.status == "error" and Colors.error or Colors.processing
			dot.Parent = row
			
			local dotCorner = Instance.new("UICorner")
			dotCorner.CornerRadius = UDim.new(1, 0)
			dotCorner.Parent = dot
			
			-- Action
			createLabel({
				text = entry.action,
				color = Colors.textSecondary,
				textSize = 11,
				font = Enum.Font.Gotham,
				size = UDim2.new(1, -90, 1, 0),
				position = UDim2.new(0, 82, 0, 0),
				parent = row
			})
		end
	end
end

local function createWidget()
	local info = DockWidgetPluginGuiInfo.new(
		Enum.InitialDockState.Float,
		true,  -- Initially enabled
		false, -- Override previous state
		280,   -- Width
		320,   -- Height
		260,   -- Min width
		280    -- Min height
	)
	
	widget = plugin:CreateDockWidgetPluginGui("StudBridge", info)
	widget.Title = "stud-bridge"
	widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
	
	-- Main container
	local container = createFrame({
		bg = Colors.bg,
		size = UDim2.new(1, 0, 1, 0),
	})
	container.Name = "Container"
	container.Parent = widget
	
	-- Padding
	local padding = Instance.new("UIPadding")
	padding.PaddingTop = UDim.new(0, 16)
	padding.PaddingBottom = UDim.new(0, 16)
	padding.PaddingLeft = UDim.new(0, 16)
	padding.PaddingRight = UDim.new(0, 16)
	padding.Parent = container
	
	-- Layout
	local layout = Instance.new("UIListLayout")
	layout.SortOrder = Enum.SortOrder.LayoutOrder
	layout.Padding = UDim.new(0, 12)
	layout.Parent = container
	
	-- ========== Status Card ==========
	local statusCard = createFrame({
		bg = Colors.bgSecondary,
		size = UDim2.new(1, 0, 0, 80),
		corner = 16,
		parent = container
	})
	statusCard.LayoutOrder = 1
	
	local statusPadding = Instance.new("UIPadding")
	statusPadding.PaddingTop = UDim.new(0, 14)
	statusPadding.PaddingBottom = UDim.new(0, 14)
	statusPadding.PaddingLeft = UDim.new(0, 14)
	statusPadding.PaddingRight = UDim.new(0, 14)
	statusPadding.Parent = statusCard
	
	-- Status header row
	local statusHeader = Instance.new("Frame")
	statusHeader.Size = UDim2.new(1, 0, 0, 24)
	statusHeader.BackgroundTransparency = 1
	statusHeader.Parent = statusCard
	
	-- Status dot (animated)
	statusDot = Instance.new("Frame")
	statusDot.Name = "Dot"
	statusDot.Size = UDim2.new(0, 10, 0, 10)
	statusDot.Position = UDim2.new(0, 0, 0.5, -5)
	statusDot.BackgroundColor3 = Colors.error
	statusDot.BorderSizePixel = 0
	statusDot.Parent = statusHeader
	
	local dotCorner = Instance.new("UICorner")
	dotCorner.CornerRadius = UDim.new(1, 0)
	dotCorner.Parent = statusDot
	
	-- Glow effect for dot
	local dotGlow = Instance.new("UIStroke")
	dotGlow.Color = Colors.error
	dotGlow.Thickness = 2
	dotGlow.Transparency = 0.7
	dotGlow.Parent = statusDot
	
	-- Status text
	statusText = createLabel({
		text = "Disconnected",
		color = Colors.text,
		textSize = 16,
		font = Enum.Font.GothamBold,
		size = UDim2.new(1, -20, 1, 0),
		position = UDim2.new(0, 18, 0, 0),
		parent = statusHeader
	})
	
	-- Processing indicator (animated spinner text)
	processingIndicator = createLabel({
		text = "",
		color = Colors.processing,
		textSize = 12,
		font = Enum.Font.GothamMedium,
		size = UDim2.new(1, 0, 0, 16),
		position = UDim2.new(0, 0, 0, 28),
		parent = statusCard
	})
	
	-- Sub text / Project info
	subText = createLabel({
		text = "Click Connect to start",
		color = Colors.textSecondary,
		textSize = 12,
		font = Enum.Font.Gotham,
		size = UDim2.new(1, 0, 0, 16),
		position = UDim2.new(0, 0, 1, -16),
		parent = statusCard
	})
	
	-- ========== Connect Button ==========
	connectButton = createButton({
		text = "Connect",
		size = UDim2.new(1, 0, 0, 44),
		corner = 14,
		parent = container
	})
	connectButton.LayoutOrder = 2
	
	connectButton.MouseButton1Click:Connect(function()
		toggleConnection()
	end)
	
	-- ========== Activity Log ==========
	local activityHeader = createLabel({
		text = "Recent Activity",
		color = Colors.textMuted,
		textSize = 11,
		font = Enum.Font.GothamBold,
		size = UDim2.new(1, 0, 0, 16),
		parent = container
	})
	activityHeader.LayoutOrder = 3
	
	activityContainer = createFrame({
		bg = Colors.bgSecondary,
		size = UDim2.new(1, 0, 1, -180),
		corner = 14,
		parent = container
	})
	activityContainer.LayoutOrder = 4
	activityContainer.ClipsDescendants = true
	
	-- Scrolling frame for activity
	local scrollFrame = Instance.new("ScrollingFrame")
	scrollFrame.Size = UDim2.new(1, 0, 1, 0)
	scrollFrame.BackgroundTransparency = 1
	scrollFrame.BorderSizePixel = 0
	scrollFrame.ScrollBarThickness = 4
	scrollFrame.ScrollBarImageColor3 = Colors.border
	scrollFrame.CanvasSize = UDim2.new(0, 0, 0, 0)
	scrollFrame.AutomaticCanvasSize = Enum.AutomaticSize.Y
	scrollFrame.Parent = activityContainer
	
	activityList = Instance.new("Frame")
	activityList.Size = UDim2.new(1, 0, 0, 0)
	activityList.BackgroundTransparency = 1
	activityList.AutomaticSize = Enum.AutomaticSize.Y
	activityList.Parent = scrollFrame
	
	local activityLayout = Instance.new("UIListLayout")
	activityLayout.SortOrder = Enum.SortOrder.LayoutOrder
	activityLayout.Parent = activityList
	
	-- Empty state
	local emptyLabel = createLabel({
		text = "No activity yet",
		color = Colors.textMuted,
		textSize = 12,
		font = Enum.Font.Gotham,
		size = UDim2.new(1, 0, 0, 40),
		align = Enum.TextXAlignment.Center,
		parent = activityList
	})
	emptyLabel.Name = "EmptyState"
	emptyLabel.TextYAlignment = Enum.TextYAlignment.Center
	
	return widget
end

-- Animate processing indicator
local processingDots = 0
local function updateProcessingAnimation()
	if isProcessing and processingIndicator then
		processingDots = (processingDots % 3) + 1
		processingIndicator.Text = "Processing" .. string.rep(".", processingDots)
	elseif processingIndicator then
		processingIndicator.Text = ""
	end
end

-- Start processing animation loop
task.spawn(function()
	while true do
		updateProcessingAnimation()
		task.wait(0.4)
	end
end)

-- Animate status dot glow
local function animateDotGlow()
	if not statusDot then return end
	
	local glow = statusDot:FindFirstChildOfClass("UIStroke")
	if not glow then return end
	
	-- Pulse animation
	while true do
		if isConnected or isConnecting then
			TweenService:Create(glow, TweenInfo.new(1, Enum.EasingStyle.Sine), {
				Transparency = 0.3
			}):Play()
			task.wait(1)
			TweenService:Create(glow, TweenInfo.new(1, Enum.EasingStyle.Sine), {
				Transparency = 0.8
			}):Play()
			task.wait(1)
		else
			glow.Transparency = 0.7
			task.wait(0.5)
		end
	end
end

task.spawn(animateDotGlow)

local function updateUI()
	if not statusDot or not statusText or not subText or not connectButton then
		return
	end
	
	local glow = statusDot:FindFirstChildOfClass("UIStroke")
	
	if isProcessing then
		statusDot.BackgroundColor3 = Colors.processing
		if glow then glow.Color = Colors.processing end
		statusText.Text = "Processing..."
		subText.Text = "Executing AI command"
		connectButton.Text = "Disconnect"
		connectButton.BackgroundColor3 = Colors.error
	elseif isConnecting then
		statusDot.BackgroundColor3 = Colors.warning
		if glow then glow.Color = Colors.warning end
		statusText.Text = "Connecting..."
		subText.Text = "Looking for Stud Desktop"
		connectButton.Text = "Cancel"
		connectButton.BackgroundColor3 = Colors.textMuted
	elseif isConnected then
		statusDot.BackgroundColor3 = Colors.success
		if glow then glow.Color = Colors.success end
		statusText.Text = "Connected"
		subText.Text = projectInfo and ("Project: " .. projectInfo) or "Ready for AI commands"
		connectButton.Text = "Disconnect"
		connectButton.BackgroundColor3 = Colors.error
	else
		statusDot.BackgroundColor3 = Colors.error
		if glow then glow.Color = Colors.error end
		statusText.Text = "Disconnected"
		subText.Text = "Click Connect to start"
		connectButton.Text = "Connect"
		connectButton.BackgroundColor3 = Colors.accent
	end
	
	toggleButton:SetActive(isConnected or isConnecting)
end

-- Utility functions
local function jsonEncode(data)
	return HttpService:JSONEncode(data)
end

local function jsonDecode(str)
	return HttpService:JSONDecode(str)
end

local function getInstanceFromPath(path)
	local parts = string.split(path, ".")
	if #parts < 2 or parts[1] ~= "game" then
		return nil
	end
	
	local current = game
	for i = 2, #parts do
		local child = current:FindFirstChild(parts[i])
		if not child then
			return nil
		end
		current = child
	end
	
	return current
end

local function getInstancePath(instance)
	local parts = {}
	local current = instance
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end
	return "game." .. table.concat(parts, ".")
end

local function instanceToInfo(instance, includeChildren)
	local info = {
		path = getInstancePath(instance),
		name = instance.Name,
		className = instance.ClassName,
	}
	
	if includeChildren then
		info.children = {}
		for _, child in ipairs(instance:GetChildren()) do
			table.insert(info.children, instanceToInfo(child, false))
		end
	end
	
	return info
end

-- Request handlers
local handlers = {}

handlers["/ping"] = function()
	return { status = "ok", plugin = PLUGIN_NAME }
end

handlers["/script/get"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	if not instance:IsA("LuaSourceContainer") then
		error("Not a script: " .. data.path)
	end
	
	local source = ScriptEditorService:GetEditorSource(instance)
	if not source then
		source = instance.Source
	end
	
	return {
		path = getInstancePath(instance),
		source = source,
		className = instance.ClassName,
	}
end

handlers["/script/set"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	if not instance:IsA("LuaSourceContainer") then
		error("Not a script: " .. data.path)
	end
	
	ScriptEditorService:UpdateSourceAsync(instance, function()
		return data.source
	end)
	
	return { path = getInstancePath(instance) }
end

handlers["/script/edit"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	if not instance:IsA("LuaSourceContainer") then
		error("Not a script: " .. data.path)
	end
	
	local source = ScriptEditorService:GetEditorSource(instance)
	if not source then
		source = instance.Source
	end
	
	local newSource, count = string.gsub(source, data.oldCode, data.newCode)
	if count == 0 then
		error("Code not found in script")
	end
	
	ScriptEditorService:UpdateSourceAsync(instance, function()
		return newSource
	end)
	
	return { path = getInstancePath(instance), replaced = count }
end

handlers["/instance/children"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local children = {}
	
	if data.recursive then
		for _, child in ipairs(instance:GetDescendants()) do
			table.insert(children, instanceToInfo(child, false))
		end
	else
		for _, child in ipairs(instance:GetChildren()) do
			table.insert(children, instanceToInfo(child, false))
		end
	end
	
	return children
end

handlers["/instance/properties"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local props = {}
	local commonProps = {"Name", "ClassName", "Parent"}
	
	if instance:IsA("BasePart") then
		local partProps = {"Position", "Size", "CFrame", "Anchored", "CanCollide", "Transparency", "BrickColor", "Material"}
		for _, p in ipairs(partProps) do
			table.insert(commonProps, p)
		end
	end
	
	if instance:IsA("GuiObject") then
		local guiProps = {"Position", "Size", "Visible", "BackgroundColor3", "BackgroundTransparency"}
		for _, p in ipairs(guiProps) do
			table.insert(commonProps, p)
		end
	end
	
	for _, propName in ipairs(commonProps) do
		local success, value = pcall(function()
			return instance[propName]
		end)
		if success then
			table.insert(props, {
				name = propName,
				value = tostring(value),
				type = typeof(value),
			})
		end
	end
	
	return props
end

handlers["/instance/set"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local value = data.value
	
	if value == "true" then
		value = true
	elseif value == "false" then
		value = false
	elseif tonumber(value) then
		value = tonumber(value)
	elseif string.match(value, "^%d+,%s*%d+,%s*%d+$") then
		local parts = string.split(value, ",")
		local a, b, c = tonumber(parts[1]), tonumber(parts[2]), tonumber(parts[3])
		if a and b and c then
			if a <= 255 and b <= 255 and c <= 255 and string.find(data.property, "Color") then
				value = Color3.fromRGB(a, b, c)
			else
				value = Vector3.new(a, b, c)
			end
		end
	elseif string.match(value, "^#%x%x%x%x%x%x$") then
		local r = tonumber(string.sub(value, 2, 3), 16)
		local g = tonumber(string.sub(value, 4, 5), 16)
		local b = tonumber(string.sub(value, 6, 7), 16)
		value = Color3.fromRGB(r, g, b)
	elseif string.match(value, "^Enum%.") then
		local parts = string.split(value, ".")
		if #parts == 3 then
			local enumType = Enum[parts[2]]
			if enumType then
				value = enumType[parts[3]]
			end
		end
	end
	
	instance[data.property] = value
	
	return { path = getInstancePath(instance) }
end

handlers["/instance/create"] = function(data)
	local parent = getInstanceFromPath(data.parent)
	if not parent then
		error("Parent not found: " .. data.parent)
	end
	
	local instance = Instance.new(data.className)
	if data.name then
		instance.Name = data.name
	end
	instance.Parent = parent
	
	return { path = getInstancePath(instance) }
end

handlers["/instance/delete"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local path = getInstancePath(instance)
	instance:Destroy()
	
	return { deleted = path }
end

handlers["/instance/clone"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local clone = instance:Clone()
	
	if data.parent then
		local parent = getInstanceFromPath(data.parent)
		if parent then
			clone.Parent = parent
		else
			error("Parent not found: " .. data.parent)
		end
	else
		clone.Parent = instance.Parent
	end
	
	return { path = getInstancePath(clone) }
end

handlers["/instance/move"] = function(data)
	local instance = getInstanceFromPath(data.path)
	if not instance then
		error("Instance not found: " .. data.path)
	end
	
	local newParent = getInstanceFromPath(data.newParent)
	if not newParent then
		error("Parent not found: " .. data.newParent)
	end
	
	instance.Parent = newParent
	
	return { path = getInstancePath(instance) }
end

handlers["/instance/bulk-create"] = function(data)
	local created = {}
	
	for _, item in ipairs(data.instances) do
		local parent = getInstanceFromPath(item.parent)
		if parent then
			local instance = Instance.new(item.className)
			if item.name then
				instance.Name = item.name
			end
			instance.Parent = parent
			table.insert(created, getInstancePath(instance))
		end
	end
	
	return { created = created }
end

handlers["/instance/bulk-delete"] = function(data)
	local deleted = {}
	
	for _, path in ipairs(data.paths) do
		local instance = getInstanceFromPath(path)
		if instance then
			local fullPath = getInstancePath(instance)
			instance:Destroy()
			table.insert(deleted, fullPath)
		end
	end
	
	return { deleted = deleted }
end

handlers["/instance/bulk-set"] = function(data)
	local updated = 0
	local errors = {}
	
	for _, op in ipairs(data.operations) do
		local instance = getInstanceFromPath(op.path)
		if not instance then
			table.insert(errors, "Not found: " .. op.path)
		else
			local success, err = pcall(function()
				local value = op.value
				
				-- Parse value based on type
				if value == "true" then
					value = true
				elseif value == "false" then
					value = false
				elseif tonumber(value) then
					value = tonumber(value)
				elseif string.match(value, "^%d+,%s*%d+,%s*%d+$") then
					local parts = string.split(value, ",")
					local a, b, c = tonumber(parts[1]), tonumber(parts[2]), tonumber(parts[3])
					if a and b and c then
						if a <= 255 and b <= 255 and c <= 255 and string.find(op.property, "Color") then
							value = Color3.fromRGB(a, b, c)
						else
							value = Vector3.new(a, b, c)
						end
					end
				elseif string.match(value, "^#%x%x%x%x%x%x$") then
					local r = tonumber(string.sub(value, 2, 3), 16)
					local g = tonumber(string.sub(value, 4, 5), 16)
					local b = tonumber(string.sub(value, 6, 7), 16)
					value = Color3.fromRGB(r, g, b)
				elseif string.match(value, "^Enum%.") then
					local parts = string.split(value, ".")
					if #parts == 3 then
						local enumType = Enum[parts[2]]
						if enumType then
							value = enumType[parts[3]]
						end
					end
				end
				
				instance[op.property] = value
			end)
			
			if success then
				updated = updated + 1
			else
				table.insert(errors, op.path .. "." .. op.property .. ": " .. tostring(err))
			end
		end
	end
	
	return { updated = updated, errors = errors }
end

handlers["/instance/search"] = function(data)
	local root = getInstanceFromPath(data.root or "game")
	if not root then
		error("Root not found: " .. (data.root or "game"))
	end
	
	local results = {}
	local limit = data.limit or 50
	
	for _, instance in ipairs(root:GetDescendants()) do
		if #results >= limit then
			break
		end
		
		local matches = true
		
		if data.name then
			matches = matches and string.lower(instance.Name):find(string.lower(data.name), 1, true) ~= nil
		end
		
		if data.className then
			matches = matches and instance.ClassName == data.className
		end
		
		if matches then
			table.insert(results, instanceToInfo(instance, false))
		end
	end
	
	return results
end

handlers["/selection/get"] = function()
	local selected = Selection:Get()
	local results = {}
	
	for _, instance in ipairs(selected) do
		table.insert(results, instanceToInfo(instance, false))
	end
	
	return results
end

handlers["/code/run"] = function(data)
	local output = {}
	
	local oldPrint = print
	print = function(...)
		local args = {...}
		local str = ""
		for i, v in ipairs(args) do
			if i > 1 then str = str .. "\t" end
			str = str .. tostring(v)
		end
		table.insert(output, str)
	end
	
	local success, result = pcall(function()
		local fn, err = loadstring(data.code)
		if not fn then
			error(err)
		end
		return fn()
	end)
	
	print = oldPrint
	
	if not success then
		return { output = table.concat(output, "\n"), error = tostring(result) }
	end
	
	if result ~= nil then
		table.insert(output, tostring(result))
	end
	
	return { output = table.concat(output, "\n") }
end

-- Paths that modify the game and should create undo waypoints
local modifyingPaths = {
	["/script/set"] = true,
	["/script/edit"] = true,
	["/instance/set"] = true,
	["/instance/create"] = true,
	["/instance/delete"] = true,
	["/instance/clone"] = true,
	["/instance/move"] = true,
	["/instance/bulk-create"] = true,
	["/instance/bulk-delete"] = true,
	["/instance/bulk-set"] = true,
	["/code/run"] = true,
}

-- Friendly names for activity log
local actionNames = {
	["/ping"] = "Ping",
	["/script/get"] = "Read Script",
	["/script/set"] = "Write Script",
	["/script/edit"] = "Edit Script",
	["/instance/children"] = "List Children",
	["/instance/properties"] = "Get Properties",
	["/instance/set"] = "Set Property",
	["/instance/create"] = "Create Instance",
	["/instance/delete"] = "Delete Instance",
	["/instance/clone"] = "Clone Instance",
	["/instance/move"] = "Move Instance",
	["/instance/bulk-create"] = "Bulk Create",
	["/instance/bulk-delete"] = "Bulk Delete",
	["/instance/bulk-set"] = "Bulk Update",
	["/instance/search"] = "Search",
	["/selection/get"] = "Get Selection",
	["/code/run"] = "Run Code",
}

-- HTTP request handler
local function handleRequest(request)
	local path = request.path or request.Path
	local body = request.body or request.Body
	
	local handler = handlers[path]
	if not handler then
		return {
			status = 404,
			body = jsonEncode({ error = "Not found: " .. path })
		}
	end
	
	local data = {}
	if body and body ~= "" then
		local success, parsed = pcall(jsonDecode, body)
		if success then
			data = parsed
		end
	end
	
	-- Create undo waypoint for modifying operations
	local isModifying = modifyingPaths[path]
	if isModifying then
		ChangeHistoryService:SetWaypoint("Stud: " .. path)
	end
	
	-- Set processing state
	isProcessing = true
	updateUI()
	
	local success, result = pcall(handler, data)
	
	-- Update activity log
	local actionName = actionNames[path] or path
	if success then
		addActivity(actionName, "success")
	else
		addActivity(actionName, "error", tostring(result))
	end
	
	isProcessing = false
	updateUI()
	
	if not success then
		return {
			status = 500,
			body = jsonEncode({ error = tostring(result) })
		}
	end
	
	-- Commit the change so it can be undone
	if isModifying then
		ChangeHistoryService:SetWaypoint("Stud: " .. path .. " (done)")
	end
	
	return {
		status = 200,
		body = jsonEncode(result)
	}
end

-- Polling loop
local function pollServer()
	local failCount = 0
	local maxFails = 3
	
	while pollingEnabled do
		local success, response = pcall(function()
			return HttpService:RequestAsync({
				Url = POLL_URL,
				Method = "GET",
			})
		end)
		
		if success and response.Success then
			-- Connected!
			if not isConnected then
				isConnected = true
				isConnecting = false
				failCount = 0
				updateUI()
				addActivity("Connected", "success")
				print("[stud-bridge] Connected to Stud Desktop")
			end
			
			local data = jsonDecode(response.Body)
			
			-- Extract project info if available
			if data and data.project then
				projectInfo = data.project
				updateUI()
			end
			
			if data and data.request then
				local result = handleRequest(data.request)
				pcall(function()
					HttpService:RequestAsync({
						Url = RESPOND_URL,
						Method = "POST",
						Headers = { ["Content-Type"] = "application/json" },
						Body = jsonEncode({
							id = data.id,
							response = result,
						}),
					})
				end)
			end
			failCount = 0
		else
			failCount = failCount + 1
			if isConnected and failCount >= maxFails then
				isConnected = false
				isConnecting = true
				projectInfo = nil
				updateUI()
				addActivity("Connection lost", "error")
				print("[stud-bridge] Connection lost, retrying...")
			end
		end
		
		task.wait(0.1)
	end
	
	-- Stopped polling
	isConnected = false
	isConnecting = false
	projectInfo = nil
	updateUI()
end

-- Toggle connection
function toggleConnection()
	pollingEnabled = not pollingEnabled
	
	if pollingEnabled then
		isConnecting = true
		updateUI()
		addActivity("Connecting", "pending")
		print("[stud-bridge] Connecting...")
		task.spawn(pollServer)
	else
		isConnected = false
		isConnecting = false
		projectInfo = nil
		updateUI()
		addActivity("Disconnected", "success")
		print("[stud-bridge] Disconnected")
	end
end

-- Initialize
createWidget()
updateUI()

toggleButton.Click:Connect(toggleConnection)

-- Show widget when button clicked
toggleButton.Click:Connect(function()
	widget.Enabled = true
end)

print("[stud-bridge] Plugin loaded - Click Connect to start")
