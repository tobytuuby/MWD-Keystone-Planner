MWDKP_ExporterDB = MWDKP_ExporterDB or {}

local ADDON_PREFIX = 'MWDKP'
local EXPORT_HEADER = 'MWDKP1'
local addonFrame = CreateFrame('Frame')
local pendingRun = nil
local pendingCompletion = nil

local function ensureDatabase()
    MWDKP_ExporterDB.runs = MWDKP_ExporterDB.runs or {}
    MWDKP_ExporterDB.version = 1
end

local function getCharacterName()
    local name = UnitName('player') or 'Unknown'
    local realm = GetRealmName() or 'Unknown'

    realm = realm:gsub('%s+', '')

    return string.format('%s-%s', name, realm)
end

local function isoTimestamp()
    return date('!%Y-%m-%dT%H:%M:%SZ')
end

local function getActiveDungeonName()
    local mapID = C_ChallengeMode.GetActiveChallengeMapID and C_ChallengeMode.GetActiveChallengeMapID()
    if not mapID then
        return 'Unknown Dungeon'
    end

    local name = C_ChallengeMode.GetMapUIInfo and C_ChallengeMode.GetMapUIInfo(mapID)
    if type(name) == 'string' and name ~= '' then
        return name
    end

    return 'Unknown Dungeon'
end

local function getActiveKeystoneLevel()
    if not C_ChallengeMode.GetActiveKeystoneInfo then
        return 0
    end

    local level = C_ChallengeMode.GetActiveKeystoneInfo()
    return tonumber(level) or 0
end

local function addRun(run)
    table.insert(MWDKP_ExporterDB.runs, run)
end

local function buildExportText()
    ensureDatabase()

    local lines = {
        EXPORT_HEADER,
        'character=' .. getCharacterName(),
        'created=' .. isoTimestamp(),
    }

    for _, run in ipairs(MWDKP_ExporterDB.runs) do
        table.insert(lines, string.format(
            'run=%s|%d|%d|%d|%s',
            run.dungeon,
            run.startLevel,
            run.upgradedToLevel,
            run.upgradeLevels,
            run.completedAt
        ))
    end

    return table.concat(lines, '\n')
end

StaticPopupDialogs['MWDKP_EXPORT_DIALOG'] = {
    text = 'Copy the export below and paste it into /mwd-kp-keys on Discord.',
    button1 = OKAY,
    hasEditBox = true,
    editBoxWidth = 360,
    maxLetters = 0,
    timeout = 0,
    whileDead = true,
    hideOnEscape = true,
    preferredIndex = STATICPOPUP_NUMDIALOGS,
    OnShow = function(self, data)
        self.editBox:SetAutoFocus(true)
        self.editBox:SetText(data or '')
        self.editBox:HighlightText()
        self.editBox:SetFocus()
    end,
    EditBoxOnEscapePressed = function(self)
        self:GetParent():Hide()
    end,
}

local function showExportDialog()
    ensureDatabase()

    if #MWDKP_ExporterDB.runs == 0 then
        print(ADDON_PREFIX .. ': no runs recorded yet.')
        return
    end

    StaticPopup_Show('MWDKP_EXPORT_DIALOG', nil, nil, buildExportText())
end

local function clearRuns()
    MWDKP_ExporterDB.runs = {}
    pendingRun = nil
    pendingCompletion = nil
    print(ADDON_PREFIX .. ': cleared recorded runs.')
end

local function printStatus()
    ensureDatabase()
    print(string.format('%s: %d recorded runs.', ADDON_PREFIX, #MWDKP_ExporterDB.runs))
end

local function finalizePendingRun(finalLevel)
    if not pendingRun then
        return
    end

    local upgradedToLevel = tonumber(finalLevel) or (pendingRun.startLevel + (pendingCompletion and pendingCompletion.upgradeLevels or 0))
    if upgradedToLevel < 0 then
        upgradedToLevel = 0
    end

    addRun({
        dungeon = pendingRun.dungeon,
        startLevel = pendingRun.startLevel,
        upgradedToLevel = upgradedToLevel,
        upgradeLevels = upgradedToLevel - pendingRun.startLevel,
        completedAt = isoTimestamp(),
    })

    print(string.format(
        '%s: recorded %s +%d -> +%d.',
        ADDON_PREFIX,
        pendingRun.dungeon,
        pendingRun.startLevel,
        upgradedToLevel
    ))

    pendingRun = nil
    pendingCompletion = nil
end

local function tryCaptureFinalLevelFromSystemMessage(message)
    if not pendingCompletion or not pendingRun then
        return
    end

    if not message or not message:find('Mythic Keystone') then
        return
    end

    local level = message:match('%+(%d+)') or message:match('level%s+(%d+)')
    if level then
        finalizePendingRun(tonumber(level))
    end
end

local function handleChallengeStart()
    ensureDatabase()

    pendingRun = {
        dungeon = getActiveDungeonName(),
        startLevel = getActiveKeystoneLevel(),
        startedAt = isoTimestamp(),
    }
    pendingCompletion = nil

    print(string.format(
        '%s: tracking %s +%d.',
        ADDON_PREFIX,
        pendingRun.dungeon,
        pendingRun.startLevel
    ))
end

local function handleChallengeCompleted()
    if not pendingRun then
        return
    end

    if C_ChallengeMode.GetCompletionInfo then
        local _, _, _, _, upgradeLevels = C_ChallengeMode.GetCompletionInfo()
        pendingCompletion = {
            upgradeLevels = tonumber(upgradeLevels) or 0,
        }
    else
        pendingCompletion = {
            upgradeLevels = 0,
        }
    end

    C_Timer.After(2, function()
        if pendingRun then
            finalizePendingRun(pendingRun.startLevel + pendingCompletion.upgradeLevels)
        end
    end)
end

SLASH_MWDKP1 = '/mwdkp'
SlashCmdList.MWDKP = function(message)
    local command = strtrim((message or ''):lower())

    if command == 'export' then
        showExportDialog()
        return
    end

    if command == 'clear' then
        clearRuns()
        return
    end

    if command == 'status' then
        printStatus()
        return
    end

    print('MWDKP: use /mwdkp export, /mwdkp status, or /mwdkp clear.')
end

addonFrame:RegisterEvent('ADDON_LOADED')
addonFrame:RegisterEvent('CHALLENGE_MODE_START')
addonFrame:RegisterEvent('CHALLENGE_MODE_COMPLETED')
addonFrame:RegisterEvent('CHAT_MSG_SYSTEM')
addonFrame:SetScript('OnEvent', function(_, event, ...)
    if event == 'ADDON_LOADED' then
        local addonName = ...
        if addonName == 'MWDKeystonePlannerExporter' then
            ensureDatabase()
        end
        return
    end

    if event == 'CHALLENGE_MODE_START' then
        handleChallengeStart()
        return
    end

    if event == 'CHALLENGE_MODE_COMPLETED' then
        handleChallengeCompleted()
        return
    end

    if event == 'CHAT_MSG_SYSTEM' then
        tryCaptureFinalLevelFromSystemMessage(...)
    end
end)
