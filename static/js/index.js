const units = {
    'g': 'kg',
    'kg': 'kg',
    'ml': 'l',
    'l': 'l',
    'oz': 'lb',
    'lb': 'lb',
    'pcs': 'pc'
}

const converterCoeff = {
    'g': 1000,
    'ml': 1000,
    'oz': 16,
    'kg': 1,
    'l': 1,
    'lb': 1,
    'pcs': 1
}

const LOCAL_STORAGE_ITEMS_KEY = 'items'

// ToDo: use it already!
const LOCAL_STORAGE_SELECTED_UNIT_KEY = 'selectedUnit'

const totalPrices = {}
let selectedUnit = 'g'

// listeners - start
const unregisterItemEventListener = (sampleNode) => {
    toggleItemListeners(sampleNode, false)
}

const registerItemEventListener = (sampleNode, allowClosing) => {
    if (allowClosing) {
        const closeButton = sampleNode.querySelector('.btn-close')
        closeButton.classList.remove('d-none')
    }
    toggleItemListeners(sampleNode, true)
}

const toggleItemListeners = (sampleNode, registerListeners) => {
    const itemPriceElement = sampleNode.querySelector('.item-price')
    const itemAmountElement = sampleNode.querySelector('.item-amount')
    const method = registerListeners ? 'addEventListener' : 'removeEventListener'
    itemPriceElement[method]('keyup', onAmountPriceChange)
    itemAmountElement[method]('keyup', onAmountPriceChange)
    sampleNode.querySelector('.btn-close')[method]('click', onItemRemove)
}

const onItemRemove = function(e) {
    e.preventDefault()
    const item = this.closest('.item')
    removeItem(item)
}

const onUnitChange = function(e) {
    selectUnit(this.getAttribute('data-unit'))
}

const onAmountPriceChange = function (e) {
    if (this.value.indexOf('-') > -1) {
        this.value = this.value.replace('-', '')
    }
    const item = this.closest('.item')
    const totalPrice = getTotalPrice(item)
    updateTotalPrices(item, totalPrice)
}

// listeners - finish

window.onload = function() {
    document.getElementById('new-list').addEventListener('click', newList)
    const btn = document.getElementById('addItem')
    btn.addEventListener('click', (e) => createItem())
    if (location.hash) {
        const [_, hash] = location.hash.split('#')
        parseStrToItems(hash, true)
    } else {
        if (localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)) {
            document.getElementById('load-from-storage-warning').classList.remove('d-none')
        }
        btn.dispatchEvent(new Event('click'))
    }

    const unitNodes = []
    Object.keys(units).forEach(unitFrom => {
        unitNodes.push(...constructUnitInput(unitFrom))
    })
    document.getElementById('units').append(...unitNodes)

    document.getElementById('clear-the-storage').addEventListener('click', clearStorage)
    document.getElementById('load-from-storage').addEventListener('click', loadFromStorage)
}

const clearStorage = (e) => {
    e.preventDefault()
    localStorage.removeItem(LOCAL_STORAGE_ITEMS_KEY)
    document.getElementById('load-from-storage-warning').classList.add('d-none')
}

const loadFromStorage = (e) => {
    e.preventDefault()
    const itemsStr = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY)
    if (itemsStr) {
        parseStrToItems(itemsStr)
    }
    document.getElementById('load-from-storage-warning').classList.add('d-none')
}


const parseStrToItems = (itemsStr, createOnReset = false) => {
    const groupedItems = {}
    itemsStr.split('&').forEach(param => {
        const [name, value] = param.split('=')
        if (name === 'selectedUnit') {
            selectUnit(value)
        } else {
            // items
            const [itemNumber, itemPropertyName] = name.split('_')  // item0_amount
            if (!groupedItems[itemNumber]) {
                groupedItems[itemNumber] = {}
            }
            groupedItems[itemNumber][itemPropertyName] = value
        }
    })
    const items = Object.values(groupedItems)
    if (items.length) {
        resetList()
        items.forEach(item => {
            createItem(decodeURI(item.name), item.price, item.amount)
        })
    } else if (createOnReset) {
        createItem()
    }
}

const resetList = () => {
    document.querySelectorAll('.item:not(.d-none)').forEach(item => {
        removeItem(item)
    })
}

const newList = () => {
    resetList()
    createItem()
    autosave()
}

const autosave = () => {
    const items = [`selectedUnit=${selectedUnit}`]
    document.querySelectorAll('.item:not(.d-none)').forEach((item, idx) => {
        if (!isNaN(getTotalPrice(item))) {
            items.push(
                `item${idx}_amount=${getItemAmount(item)}`,
                `item${idx}_price=${getItemPrice(item)}`,
                `item${idx}_name=${item.querySelector('.item-name').value}`
            )
        }
    })
    const itemsStr = items.join('&')
    location.hash = itemsStr
    localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, itemsStr)
}

const updateTotalPrices = (item, totalPrice) => {
    if (isNaN(totalPrice)) {
        item.querySelector('.total-price').innerHTML = '-'
        delete totalPrices[item.getAttribute('id')]
    } else {
        item.querySelector('.total-price').innerHTML = totalPrice
        totalPrices[item.getAttribute('id')] = totalPrice
    }
    refreshBestPrice()
    autosave()
}

const getTotalPrice = (item) => {
    const amount = getItemAmount(item)
    const pricePerValue = getItemPrice(item)
    if (!amount || isNaN(pricePerValue)) {
        return NaN
    }
    return (pricePerValue / amount * converterCoeff[selectedUnit]).toFixed(2)

}

const getItemAmount = (item) => parseFloat(item.querySelector('.item-amount').value)

const getItemPrice = (item) => parseFloat(item.querySelector('.item-price').value)

const refreshBestPrice = () => {
    const minPrice = Math.min(...Object.values(totalPrices))
    document.querySelectorAll('.card-total-footer').forEach(totalPrice => {
        if (parseFloat(totalPrice.querySelector('.total-price').innerHTML) === minPrice) {
            totalPrice.classList.add('best-price')
        } else {
            totalPrice.classList.remove('best-price')
        }
    })
}

const selectUnit = (newUnitValue) => {
    selectedUnit = newUnitValue
    document.querySelectorAll('.unit-name').forEach(e => {
        e.innerHTML = units[selectedUnit]
    })
    document.querySelectorAll('.item-price').forEach(input => {
        input.dispatchEvent(new Event('keyup'))
    })
    autosave()
}

const createItem = (itemName, itemPrice, itemAmount) => {
    const itemsList = document.getElementById('items')
    const itemOrder = itemsList.children.length
    const newItem = generateNewItem(itemName, itemOrder)
    registerItemEventListener(newItem, itemOrder !== 1)

    const itemPriceElement = newItem.querySelector('.item-price')
    const itemAmountElement = newItem.querySelector('.item-amount')
    itemAmountElement.setAttribute('placeholder', `Amount in ${selectedUnit}`)
    itemsList.appendChild(newItem)
    if (itemPrice && itemAmount) {
        itemPriceElement.value = itemPrice
        itemAmountElement.value = itemAmount
        itemAmountElement.dispatchEvent(new Event('keyup'))
    }
}

const generateNewItem = (itemName, itemOrder) => {
    const newItem = document.getElementById('item').cloneNode(true)
    newItem.setAttribute('id', `card-${itemOrder}`)
    newItem.classList.remove('d-none')
    // ToDo: use a correct name
    newItem.querySelector('.item-name').value = itemName ? itemName : `Item ${itemOrder}`
    return newItem
}

const removeItem = (item) => {
    unregisterItemEventListener(item)
    updateTotalPrices(item, NaN)
    document.getElementById('items').removeChild(item)
}

const constructUnitInput = (unitFrom) => {
    const unitInput = document.createElement('input')
    const unitInputId = `unit-${unitFrom}`
    unitInput.setAttribute('type', 'radio')
    unitInput.setAttribute('name', 'units-selector')
    unitInput.setAttribute('id', unitInputId)
    unitInput.setAttribute('data-unit', unitFrom)
    unitInput.setAttribute('class', 'btn-check')
    unitInput.setAttribute('autocomplete', 'off')
    unitInput.addEventListener('change', onUnitChange)
    if (unitFrom === selectedUnit) {
        unitInput.setAttribute('checked', 'checked')
    }

    const unitLabel = document.createElement('label')
    unitLabel.setAttribute('class', 'btn btn-outline-primary')
    unitLabel.setAttribute('for', unitInputId)
    unitLabel.innerHTML = `${unitFrom}`

    return [unitInput, unitLabel]
}
