use chainhook_types::OrdinalInscriptionRevealData;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DbInscriptionParent {
    pub inscription_id: String,
    pub parent_inscription_id: String,
}

impl DbInscriptionParent {
    pub fn from_reveal(reveal: &OrdinalInscriptionRevealData) -> Result<Vec<Self>, String> {
        Ok(reveal
            .parents
            .iter()
            .map(|p| DbInscriptionParent {
                inscription_id: reveal.inscription_id.clone(),
                parent_inscription_id: p.clone(),
            })
            .collect())
    }
}
