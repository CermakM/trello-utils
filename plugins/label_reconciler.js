/**
 * This is a Trello plugin for reconciling labels.
 * 
 */

(async function () {

    function assignLabels(card, labels) {
        const assignedLabels = []
        for (const label of labels) {
            const re = new RegExp(label.selector)
            if ( card.name.search(re) !== -1) {
                assignedLabels.push(label.id)
            }
        }

        return assignedLabels
    }

    function hasLabel(card, labelID) {
        if (labelID === undefined) {
            throw Error('Argument `labelID` can not be undefined.')
        }
        return card.idLabels.includes(labelID)
    }

    function updateTrelloCards(cards, labels) {
        let failed  = 0,
            skipped = 0,
            updated = 0;
        cards.forEach((card) => {
            assignLabels(card, labels).forEach( async (labelID) => {
                if (hasLabel(card, labelID)) {
                    skipped += 1
                    return  // nothing to be done
                }

                await Trello.post(`/cards/${card.id}/idLabels`, {value: labelID})
                    .then(() => updated += 1)
                    .catch((err) => {
                        console.error('Error updating card:', err)
                        failed += 1
                    })
            })
        })

        console.log(`Success. Updated ${updated} cards, ${skipped} skipped and ${failed} failed.`)
    }

    // Configuration for the current Trello model
    const modelConfig = config.rules.find((r) => r.model.name === model.name)
    if (modelConfig == undefined) {
        console.error(`Configuration was not found for model '${model.name}'`)
        return
    }

    await Trello.get('/boards/' + model.id + '/lists/open')
        .then(async (lists) => {
            const cards = []
            for (const list of lists) {
                if (!modelConfig.columns.some(p => RegExp(p).test(list.name))) {
                    continue
                }

                console.log(`Collecting cards for culumn '${list.name}'.`)
                await Trello.get('/lists/' + list.id + '/cards')
                    .then(arr => cards.push(...arr))
            }

            return cards
        })
        .then((cards) => {
            console.log(`Updating ${cards.length} Trello cards`)
            updateTrelloCards(cards, modelConfig.labels)
        })
        .catch(err => console.error(err.response ? err.response.toJSON() : err))
}())
