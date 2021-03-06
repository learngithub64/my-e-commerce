import React, { Fragment, useEffect, useState } from "react"
import { useIntl } from "gatsby-plugin-intl"
import axios from "axios"
import Noty from "noty"
import { useDispatch, useSelector } from "react-redux"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import Img from "gatsby-image/withIEPolyfill"
import { useStaticQuery, graphql } from "gatsby"
import { BASKET, BASKET_PRODUCT } from "@functions/api"
import { Link } from "gatsby-plugin-intl"
import styles from "./styles.module.scss"
import { updateUser } from "@store/user"

const BasketProducts = () => {
  const products = useStaticQuery(graphql`
    query basketProducts {
      allMarkdownRemark(filter: { fileAbsolutePath: { regex: "/products/" } }) {
        edges {
          node {
            frontmatter {
              id: product_id
              categoryId: category_id
              nameEn: name_en
              price
              imageAlt
              image {
                childImageSharp {
                  fluid(maxWidth: 400) {
                    ...GatsbyImageSharpFluid
                  }
                }
              }
            }
          }
        }
      }
    }
  `)
  const intl = useIntl()
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const [token, setToken] = useState(null)

  useEffect(() => {
    setToken(localStorage.getItem("e-commerce-token"))
  }, [])

  const productsInBasket = products?.allMarkdownRemark?.edges?.filter(
    ({ node: { frontmatter: filteredProduct } }) => {
      return (
        filteredProduct?.categoryId !== "featured" &&
        user?.basket?.find(
          basketProduct => basketProduct?.productId === filteredProduct?.id
        )
      )
    }
  )

  const getTotalProductsCount = () => {
    return user?.basket?.reduce((total, { quantity }, index, array) => {
      total += quantity
      return total
    }, 0)
  }

  const getTotalBasketPrice = () => {
    const price = user?.basket?.reduce(
      (total, { productPrice, quantity }, index, array) => {
        total += productPrice * quantity
        return total
      },
      0
    )
    return Math.ceil(price * 100) / 100
  }

  const handleCheckout = async () => {
    try {
      const { headers } = await axios.delete(BASKET, {
        headers: {
          "x-auth-token": token,
        },
      })
      dispatch(updateUser(headers["x-auth-token"]))

      new Noty({
        text: intl.formatMessage({
          id: "components.basketProducts.noty",
        }),
        type: "success",
        layout: "topLeft",
        theme: "sunset",
        timeout: "3000",
      }).show()
    } catch (error) {
      new Noty({
        text: error?.message,
        type: "success",
        layout: "topLeft",
        theme: "sunset",
        timeout: "3000",
      }).show()
    }
  }

  return (
    <div className={styles.basketProductsWrapper}>
      <div className={styles.basketProductsHeadingWrapper}>
        <div className={styles.basketProductsHeadingContainer}>
          <p>{`${getTotalProductsCount()} ${intl.formatMessage({
            id: "components.basketProducts.products",
          })}`}</p>
          <p>{`£${getTotalBasketPrice()}`}</p>
        </div>
        {!!getTotalProductsCount() && (
          <div className={styles.basketProductsHeadingContainer}>
            <button onClick={() => handleCheckout()}>
              {intl.formatMessage({
                id: "components.basketProducts.button",
              })}
            </button>
          </div>
        )}
      </div>
      <hr />
      {productsInBasket?.map(({ node: { frontmatter: product } }) => (
        <Fragment key={product?.id}>
          <BasketProduct
            name={product?.nameEn}
            image={product?.image}
            imageAlt={product?.imageAlt}
            price={product?.price}
            id={product?.id}
          />
          <hr />
        </Fragment>
      ))}
    </div>
  )
}

export default BasketProducts

const BasketProduct = ({ name, image, imageAlt, price, id }) => {
  const intl = useIntl()
  const user = useSelector(state => state.user)
  const dispatch = useDispatch()
  const [token, setToken] = useState(null)

  useEffect(() => {
    setToken(localStorage.getItem("e-commerce-token"))
  }, [])

  const getQuantity = () => {
    const foundProduct = user?.basket?.find(
      basketProduct => basketProduct?.productId === id
    )
    return !!foundProduct ? foundProduct?.quantity : 1
  }

  const addToBasket = async id => {
    try {
      const { headers } = await axios.post(
        BASKET,
        { productId: id, quantity: 1, productPrice: price },
        {
          headers: {
            "x-auth-token": token,
          },
        }
      )
      dispatch(updateUser(headers["x-auth-token"]))
    } catch (error) {
      console.log(error)
    }
  }

  const removeFromBasket = async id => {
    try {
      const { headers } = await axios.put(
        BASKET_PRODUCT(id),
        {},
        {
          headers: {
            "x-auth-token": token,
          },
        }
      )
      dispatch(updateUser(headers["x-auth-token"]))
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className={styles.productWrapper}>
      <div>
        <Img
          fluid={{
            ...image?.childImageSharp?.fluid,
            aspectRatio: 1 / 1,
          }}
          alt={imageAlt}
          objectFit="cover"
          objectPosition="50% 50%"
        />
      </div>
      <div>
        <p>{name}</p>
        <p className={styles.productPrice}>{`£${price}`}</p>
        <div className={styles.quantityContainer}>
          <p>{`${intl.formatMessage({
            id: "components.basketProducts.quantity",
          })} ${getQuantity()}`}</p>
          <button onClick={() => addToBasket(id)}>
            <FontAwesomeIcon icon="plus" className={styles.fontAwesomeIcon} />
          </button>

          <button onClick={() => removeFromBasket(id)}>
            <FontAwesomeIcon icon="minus" className={styles.fontAwesomeIcon} />
          </button>
        </div>
      </div>
    </div>
  )
}
