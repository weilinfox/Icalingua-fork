import {BrowserWindow, ipcMain, screen} from 'electron'
import LoginForm from '../../types/LoginForm'
import {getConfig} from '../utils/configManager'
import getWinUrl from '../../utils/getWinUrl'
import oicqAdapter from '../adapters/oicqAdapter'
import Adapter from '../../types/Adapter'
import socketIoAdapter from '../adapters/socketIoAdapter'

let adapter: Adapter
if (getConfig().adapter === 'oicq')
    adapter = oicqAdapter
else if (getConfig().adapter === 'socketIo')
    adapter = socketIoAdapter

export const {
    sendMessage, createBot,
    getUin, getGroupFileMeta, getUnreadCount, getFirstUnreadRoom,
    getSelectedRoom, getRoom, setOnlineStatus, logOut,
    clearCurrentRoomUnread, setRoomPriority, setRoomAutoDownload, setRoomAutoDownloadPath,
    pinRoom, ignoreChat, removeChat, deleteMessage, revealMessage, fetchHistory,
} = adapter
export const fetchLatestHistory = (roomId: number) => {
    let buffer: Buffer
    let uid = roomId
    if (roomId < 0) {
        buffer = Buffer.alloc(21)
        uid = -uid
    } else buffer = Buffer.alloc(17)
    buffer.writeUInt32BE(uid, 0)
    fetchHistory(buffer.toString('base64'), roomId)
}

ipcMain.on('createBot', (event, form: LoginForm) => createBot(form))
ipcMain.handle('getFriendsAndGroups', adapter.getFriendsAndGroups)
ipcMain.on('sendMessage', (_, data) => sendMessage(data))
ipcMain.handle('fetchMessage', (_, {roomId, offset}: { roomId: number, offset: number }) =>
    adapter.fetchMessages(roomId, offset))
ipcMain.on('sliderLogin', (_, ticket: string) => adapter.sliderLogin(ticket))
ipcMain.on('reLogin', adapter.reLogin)
ipcMain.on('updateRoom', (_, roomId: number, room: object) => adapter.updateRoom(roomId, room))
ipcMain.on('updateMessage', (_, roomId: number, messageId: string, message: object) =>
    adapter.updateMessage(roomId, messageId, message))
ipcMain.on('sendGroupPoke', (_, gin, uin) => adapter.sendGroupPoke(gin, uin))
ipcMain.on('addRoom', (_, room) => adapter.addRoom(room))
ipcMain.on('openForward', async (_, resId: string) => {
    const messages = await adapter.getForwardMsg(resId)
    const size = screen.getPrimaryDisplay().size
    let width = size.width - 300
    if (width > 1440) width = 900
    const win = new BrowserWindow({
        height: size.height - 200,
        width,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: true,
            webSecurity: false,
            contextIsolation: false,
        },
    })
    win.loadURL(getWinUrl() + '#/history')
    win.webContents.on('did-finish-load', function () {
        win.webContents.send('loadMessages', messages)
    })
})