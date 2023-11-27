const bcbSelicRequest = Functions.makeHttpRequest({
	url: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json`,
})
const tesouroDataRequest = Functions.makeHttpRequest({
	url: `https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondsinfo.json`,
})

const [bcbSelic, tesouroData] = await Promise.all([bcbSelicRequest, tesouroDataRequest])
const taxaSelic = bcbSelic.data[0].valor * 10 ** 6
const filteredArray = tesouroData.data.response.TrsrBdTradgList.filter(
	(item) => item.TrsrBd.cd === 178
) //CD for Tesouro Selic 2029
const unitValue = filteredArray[0].TrsrBd.untrInvstmtVal * 10 ** 18
const maturityDate = new Date(filteredArray[0].TrsrBd.mtrtyDt).getTime() / 1000
const data = {
	taxaSelic: taxaSelic,
	unitValue: unitValue,
	maturityDate: maturityDate,
}
const taxaSelicEncoded = Functions.encodeUint256(taxaSelic)
const unitValueEncoded = Functions.encodeUint256(unitValue)
const maturityDateEncoded = Functions.encodeUint256(maturityDate)

let totalLength = taxaSelicEncoded.length + unitValueEncoded.length + maturityDateEncoded.length

let combinedArrayBuffer = new ArrayBuffer(totalLength)
let combinedView = new Uint8Array(combinedArrayBuffer)

combinedView.set(taxaSelicEncoded, 0)
combinedView.set(unitValueEncoded, taxaSelicEncoded.length)
combinedView.set(maturityDateEncoded, taxaSelicEncoded.length + unitValueEncoded.length)
return combinedView
