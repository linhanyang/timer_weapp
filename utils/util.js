const formatDateTime = date => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()

    return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatDateTimeShort = date => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return [month, day].map(formatNumber).join('/') + ' ' + [hour, minute].map(formatNumber).join(':')
}

const formatDate = date => {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    return [year, month, day].map(formatNumber).join('-');
}
const formatTime = date => {
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    return [hour, minute].map(formatNumber).join(':')
}

/**
 * 把毫秒数格式化为：00:00
 */
const formatCountdown = (countdown) => {
    var cd = countdown / 1000;
    var h = parseInt(cd / 3600);
    var m = parseInt(Math.round(cd % 3600) / 60);
    var s = parseInt(Math.round(cd % 3600) % 60);
    return [h, m, s].map(formatNumber).join(':')
}

const formatNumber = n => {
    n = n.toString()
    return n[1] ? n : '0' + n
}

module.exports = {
    formatDate: formatDate,
    formatTime: formatTime,
    formatDateTime: formatDateTime,
    formatDateTimeShort: formatDateTimeShort,
    formatCountdown: formatCountdown
}
