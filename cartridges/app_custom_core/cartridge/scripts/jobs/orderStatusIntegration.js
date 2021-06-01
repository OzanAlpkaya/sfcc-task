
var File = require('dw/io/File');
var FileWriter = require('dw/io/FileWriter');
var FileReader = require('dw/io/FileReader');
var CSVStreamWriter = require('dw/io/CSVStreamWriter');
var XMLStreamReader = require('dw/io/XMLStreamReader');
var XMLStreamConstants = require('dw/io/XMLStreamConstants');

var Transaction = require('dw/system/Transaction');
var OrderMgr = require('dw/order/OrderMgr');
var Calendar = require('dw/util/Calendar');
var StringUtils = require('dw/util/StringUtils');

function exportOrders() {
    var now = new Calendar(new Date());

    var csvFile = new File('IMPEX/src/order/orderCustomExport' + StringUtils.formatCalendar(now, "_yyyy:MM:dd_hh:mm:ss") + '.csv');
    var csvFileWriter = new FileWriter(csvFile);
    csvWriter = new CSVStreamWriter(csvFileWriter, "|");

    csvWriter.writeNext([
        'Customer Info',
        'Payment',
        'Addresses',
        'Order Totals',
        'Line Items'
    ]);

    var orders = OrderMgr.searchOrders('custom.customStatus != {0}', null, '');
    while (orders.hasNext()){
        writeOrder(orders.next(), csvWriter);
    }

    csvWriter.close();
    csvFileWriter.close();
}

function importStatuses() {
    var xmlFile = new File('IMPEX/src/order/orderStatuses.xml');
    var xmlFileReader = new FileReader(xmlFile);
    var xmlStreamReader = new XMLStreamReader(xmlFileReader);

    var order;
    while (xmlStreamReader.hasNext()) {
        var tempElement = xmlStreamReader.next();
        if (tempElement === XMLStreamConstants.START_ELEMENT) {
            var localElementName = xmlStreamReader.getLocalName();

            if (localElementName === 'order') {
                order = OrderMgr.getOrder(xmlStreamReader.getAttributeValue(null, 'orderno'));
            } else if (localElementName === 'status') {
                xmlStreamReader.next();
                Transaction.wrap(function () {
                    order.custom.customStatus = xmlStreamReader.getText();
                });
            }
        } 
    }

    xmlStreamReader.close();
    xmlFileReader.close();
}

function writeOrder(order, csvWriter) {
    // //Customer Information
    var profile = order.customer.profile;
    var customerObj = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        isRegistered: order.customer.registered
    };

    var paymentObj = {
        method: order.paymentInstrument.paymentMethod
    };
    
    //Address Information
    var shippingAddressesObj = [];
    var shipments = order.shipments.toArray();
    shipments.forEach(function(shipment) {
        shippingAddressesObj.push({
            address1: shipment.shippingAddress.address1,
            address1: shipment.shippingAddress.address2,
            firstName: shipment.shippingAddress.firstName,
            lastName: shipment.shippingAddress.lastName,
            phone: shipment.shippingAddress.phone,
            countryCode: shipment.shippingAddress.countryCode,
            stateCode: shipment.shippingAddress.stateCode
        }); 
    });

    //Order Total
    var orderTotalObj = {
        gross: order.totalGrossPrice,
        net: order.totalNetPrice,
        tax: order.totalTax
    };

    //Products
    var productLineItems = order.productLineItems.toArray();
    var productsObj = [];
    productLineItems.forEach(function (pli) {
        productsObj.push({
            id: pli.productID,
            quantity: pli.quantity.value,
            grossPrice: pli.grossPrice.value,
            netPrice: pli.netPrice.value,
            tax: pli.tax.value
        });
    });

    csvWriter.writeNext([
        JSON.stringify(customerObj),
        JSON.stringify(paymentObj),
        JSON.stringify(shippingAddressesObj),
        JSON.stringify(orderTotalObj),
        JSON.stringify(productsObj)
    ]);
}

module.exports = {
    exportOrders: exportOrders,
    importStatuses: importStatuses
};
